import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, SlotReservationSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

const RESERVATION_MINUTES = 10;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimit = applyRateLimit(req, "publicRead");
  if (!rateLimit.success) return rateLimit.response;

  const { slug } = await params;
  const staffId = req.nextUrl.searchParams.get("staffId");
  const date = req.nextUrl.searchParams.get("date");
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  
  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  if (!staffId || !date) {
    return NextResponse.json({ error: "staffId and date required" }, { status: 400 });
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Clean expired reservations
    await prisma.slotReservation.deleteMany({
      where: { expiresAt: { lt: new Date() }, salonId: salon.id },
    });

    // Get active reservations (excluding current session)
    const reservations = await prisma.slotReservation.findMany({
      where: {
        salonId: salon.id,
        staffId,
        startTime: { gte: startOfDay, lte: endOfDay },
        sessionId: { not: sessionId || "" },
      },
    });

    // Get booked appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: salon.id,
        staffId,
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ["cancelled", "no-show"] },
      },
    });

    return NextResponse.json({ reservations, appointments });
  } catch (error) {
    console.error("Fetch slot reservations error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimit = applyRateLimit(req, "api");
  if (!rateLimit.success) return rateLimit.response;

  const { slug } = await params;
  
  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const validation = validateBody(SlotReservationSchema, body);
    if (!validation.success) return validation.response;

    const { staffId, startTime, endTime, sessionId } = validation.data;

    // Clean expired reservations
    await prisma.slotReservation.deleteMany({
      where: { expiresAt: { lt: new Date() }, salonId: salon.id },
    });

    // Clear previous reservation for this session
    await prisma.slotReservation.deleteMany({
      where: { sessionId, salonId: salon.id },
    });

    // Check for conflicts
    const conflict = await prisma.slotReservation.findFirst({
      where: {
        salonId: salon.id,
        staffId,
        startTime: { lt: new Date(endTime) },
        endTime: { gt: new Date(startTime) },
      },
    });

    if (conflict) {
      return NextResponse.json({ error: "Slot already reserved" }, { status: 409 });
    }

    // Check for appointment conflicts
    const appointmentConflict = await prisma.appointment.findFirst({
      where: {
        salonId: salon.id,
        staffId,
        status: { notIn: ["cancelled", "no-show"] },
        startTime: { lt: new Date(endTime) },
        endTime: { gt: new Date(startTime) },
      },
    });

    if (appointmentConflict) {
      return NextResponse.json({ error: "Slot already booked" }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

    const reservation = await prisma.slotReservation.create({
      data: {
        salonId: salon.id,
        staffId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        sessionId,
        expiresAt,
      },
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Create slot reservation error:", error);
    return NextResponse.json({ error: "Failed to reserve" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimit = applyRateLimit(req, "api");
  if (!rateLimit.success) return rateLimit.response;

  const { slug } = await params;
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  
  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    await prisma.slotReservation.deleteMany({
      where: { sessionId, salonId: salon.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete slot reservation error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
