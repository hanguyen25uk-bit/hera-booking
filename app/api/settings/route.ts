import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function getDefaultSalonId() {
  const salon = await prisma.salon.findFirst();
  return salon?.id;
}

export async function GET() {
  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    });

    // Return settings in expected format
    return NextResponse.json({
      salonName: salon?.name,
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
    const salonId = await getDefaultSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    const body = await req.json();
    const { salonName, salonPhone, salonAddress, cancelMinutesAdvance } = body;

    const salon = await prisma.salon.update({
      where: { id: salonId },
      data: {
        name: salonName,
        phone: salonPhone,
        address: salonAddress,
        cancelMinutesAdvance,
      },
    });

    return NextResponse.json({
      salonName: salon.name,
      salonPhone: salon.phone,
      salonAddress: salon.address,
      cancelMinutesAdvance: salon.cancelMinutesAdvance,
    });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
