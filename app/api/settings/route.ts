import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/admin-auth";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  // Fallback for legacy single-tenant
  const salon = await prisma.salon.findFirst();
  return salon?.id || null;
}

export async function GET() {
  try {
    const salonId = await getSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    });

    // Return settings in expected format
    return NextResponse.json({
      salonName: salon?.name,
      salonSlug: salon?.slug,
      salonPhone: salon?.phone,
      salonAddress: salon?.address,
      cancelMinutesAdvance: salon?.cancelMinutesAdvance,
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const salonId = await getSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    const body = await req.json();
    const { salonName, salonSlug, salonPhone, salonAddress, cancelMinutesAdvance } = body;

    // If slug is being changed, validate uniqueness
    if (salonSlug) {
      const existingSalon = await prisma.salon.findFirst({
        where: {
          slug: salonSlug,
          NOT: { id: salonId },
        },
      });

      if (existingSalon) {
        return NextResponse.json(
          { error: "This booking URL is already taken. Please choose a different one." },
          { status: 400 }
        );
      }

      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(salonSlug)) {
        return NextResponse.json(
          { error: "Booking URL can only contain lowercase letters, numbers, and hyphens." },
          { status: 400 }
        );
      }

      if (salonSlug.length < 3) {
        return NextResponse.json(
          { error: "Booking URL must be at least 3 characters long." },
          { status: 400 }
        );
      }
    }

    const salon = await prisma.salon.update({
      where: { id: salonId },
      data: {
        name: salonName,
        slug: salonSlug || undefined,
        phone: salonPhone,
        address: salonAddress,
        cancelMinutesAdvance,
      },
    });

    return NextResponse.json({
      salonName: salon.name,
      salonSlug: salon.slug,
      salonPhone: salon.phone,
      salonAddress: salon.address,
      cancelMinutesAdvance: salon.cancelMinutesAdvance,
    });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
