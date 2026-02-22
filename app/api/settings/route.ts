import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, generateSalonToken } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, SettingsSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  return "heranailspa";
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

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
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const salonId = await getSalonId();
  if (!salonId) {
    return NextResponse.json({ error: "No salon found" }, { status: 404 });
  }

  const body = await req.json();
  const validation = validateBody(SettingsSchema, body);
  if (!validation.success) return validation.response;

  const { salonName, salonPhone, salonAddress, cancelMinutesAdvance } = validation.data;
  // Clean up the slug - strip leading/trailing hyphens
  const salonSlug = validation.data.salonSlug?.replace(/^-+|-+$/g, '') || '';

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

  // Get current auth to check if slug is changing
  const currentAuth = await getAuthPayload();
  const slugIsChanging = salonSlug && currentAuth?.salonSlug !== salonSlug;

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

  const response = NextResponse.json({
    salonName: salon.name,
    salonSlug: salon.slug,
    salonPhone: salon.phone,
    salonAddress: salon.address,
    cancelMinutesAdvance: salon.cancelMinutesAdvance,
  });

  // If slug changed, regenerate auth token with new slug
  if (slugIsChanging && currentAuth) {
    const newToken = generateSalonToken({
      salonId: currentAuth.salonId,
      salonSlug: salon.slug,
      userId: currentAuth.userId,
    });

    response.cookies.set("salon_auth", newToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
  }

  return response;
});
