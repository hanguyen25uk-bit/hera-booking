import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, SlotReservationSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

const RESERVATION_MINUTES = 8; // Giữ chỗ 10 phút

async function getDefaultSalonId() {
  return "heranailspa";
}

// POST - Reserve a slot
export const POST = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "api");
  if (!rateLimit.success) return rateLimit.response;

  const salonId = await getDefaultSalonId();
  if (!salonId) {
    return NextResponse.json({ error: "No salon found" }, { status: 404 });
  }

  const body = await req.json();
  const validation = validateBody(SlotReservationSchema, body);
  if (!validation.success) return validation.response;

  const { staffId, startTime, endTime, sessionId } = validation.data;

  const startDateTime = new Date(startTime);
  const endDateTime = new Date(endTime);
  const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

  // Clean up expired reservations first
  await prisma.slotReservation.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  // Check if slot is already reserved by someone else
  const existingReservation = await prisma.slotReservation.findFirst({
    where: {
      staffId,
      startTime: startDateTime,
      sessionId: { not: sessionId },
      expiresAt: { gt: new Date() },
    },
  });

  if (existingReservation) {
    return NextResponse.json({
      error: "Slot is temporarily reserved by another customer",
      reserved: true
    }, { status: 409 });
  }

  // Check if there's an actual appointment
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      staffId,
      status: { not: "cancelled" },
      OR: [
        {
          startTime: { lte: startDateTime },
          endTime: { gt: startDateTime },
        },
        {
          startTime: { lt: endDateTime },
          endTime: { gte: endDateTime },
        },
        {
          startTime: { gte: startDateTime },
          endTime: { lte: endDateTime },
        },
      ],
    },
  });

  if (existingAppointment) {
    return NextResponse.json({
      error: "Slot is already booked",
      booked: true
    }, { status: 409 });
  }

  // Create or update reservation
  const reservation = await prisma.slotReservation.upsert({
    where: {
      staffId_startTime: {
        staffId,
        startTime: startDateTime,
      },
    },
    update: {
      sessionId,
      endTime: endDateTime,
      expiresAt,
    },
    create: {
      salonId,
      staffId,
      startTime: startDateTime,
      endTime: endDateTime,
      sessionId,
      expiresAt,
    },
  });

  return NextResponse.json({
    success: true,
    reservation,
    expiresAt,
    expiresInMinutes: RESERVATION_MINUTES,
  });
});

// DELETE - Release a reservation
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "api");
  if (!rateLimit.success) return rateLimit.response;

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const staffId = req.nextUrl.searchParams.get("staffId");
  const startTime = req.nextUrl.searchParams.get("startTime");

  if (sessionId && staffId && startTime) {
    // Delete specific reservation
    await prisma.slotReservation.deleteMany({
      where: {
        sessionId,
        staffId,
        startTime: new Date(startTime),
      },
    });
  } else if (sessionId) {
    // Delete all reservations for this session
    await prisma.slotReservation.deleteMany({
      where: { sessionId },
    });
  }

  return NextResponse.json({ success: true });
});

// GET - Check slot availability and reservations
export const GET = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "publicRead");
  if (!rateLimit.success) return rateLimit.response;

  const staffId = req.nextUrl.searchParams.get("staffId");
  const date = req.nextUrl.searchParams.get("date");
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!staffId || !date) {
    return NextResponse.json({ error: "staffId and date required" }, { status: 400 });
  }

  // Clean up expired reservations
  await prisma.slotReservation.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  const startOfDay = new Date(date + "T00:00:00.000Z");
  const endOfDay = new Date(date + "T23:59:59.999Z");

  // Get all reservations for this staff on this date (excluding current session)
  const reservations = await prisma.slotReservation.findMany({
    where: {
      staffId,
      startTime: { gte: startOfDay, lte: endOfDay },
      expiresAt: { gt: new Date() },
      ...(sessionId ? { sessionId: { not: sessionId } } : {}),
    },
  });

  // Get all appointments for this staff on this date
  const appointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: { not: "cancelled" },
      startTime: { gte: startOfDay, lte: endOfDay },
    },
  });

  return NextResponse.json({
    reservations: reservations.map(r => ({
      startTime: r.startTime,
      endTime: r.endTime,
      expiresAt: r.expiresAt,
    })),
    appointments: appointments.map(a => ({
      startTime: a.startTime,
      endTime: a.endTime,
    })),
  });
});
