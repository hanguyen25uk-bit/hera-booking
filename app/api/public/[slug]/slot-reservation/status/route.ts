import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimit = applyRateLimit(req, "publicRead");
  if (!rateLimit.success) return rateLimit.response;

  const { slug } = await params;
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ valid: false, error: "Missing sessionId" }, { status: 400 });
  }

  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  const reservation = await prisma.slotReservation.findFirst({
    where: { sessionId, salonId: salon.id },
  });

  if (!reservation) {
    return NextResponse.json({ valid: false, secondsRemaining: 0 });
  }

  const secondsRemaining = Math.max(0,
    Math.floor((reservation.expiresAt.getTime() - Date.now()) / 1000)
  );

  return NextResponse.json({
    valid: secondsRemaining > 0,
    secondsRemaining,
    expiresAt: reservation.expiresAt.toISOString(),
  });
}
