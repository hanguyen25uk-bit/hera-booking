import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RESERVATION_MINUTES = 8; // Giữ chỗ 10 phút

async function getDefaultSalonId() {
  const salon = await prisma.salon.findFirst();
  return salon?.id;
}

// POST - Reserve a slot
export async function POST(req: NextRequest) {
  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    const { staffId, startTime, endTime, sessionId } = await req.json();

    if (!staffId || !startTime || !endTime || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

    // Clean up expired reservations for this salon
    await prisma.slotReservation.deleteMany({
      where: {
        salonId,
        expiresAt: { lt: new Date() },
      },
    });

    // Check if slot is already reserved by someone else
    const existingReservation = await prisma.slotReservation.findFirst({
      where: {
        salonId,
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
        salonId,
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
  } catch (error) {
    console.error("Reserve slot error:", error);
    return NextResponse.json({ error: "Failed to reserve slot" }, { status: 500 });
  }
}

// DELETE - Release a reservation
export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const staffId = req.nextUrl.searchParams.get("staffId");
  const startTime = req.nextUrl.searchParams.get("startTime");

  try {
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
  } catch (error) {
    console.error("Release slot error:", error);
    return NextResponse.json({ error: "Failed to release slot" }, { status: 500 });
  }
}

// GET - Check slot availability and reservations
export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  const date = req.nextUrl.searchParams.get("date");
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!staffId || !date) {
    return NextResponse.json({ error: "staffId and date required" }, { status: 400 });
  }

  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    // Clean up expired reservations for this salon only
    await prisma.slotReservation.deleteMany({
      where: {
        salonId,
        expiresAt: { lt: new Date() },
      },
    });

    const startOfDay = new Date(date + "T00:00:00.000Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");

    // Get all reservations for this staff on this date (excluding current session)
    const reservations = await prisma.slotReservation.findMany({
      where: {
        salonId,
        staffId,
        startTime: { gte: startOfDay, lte: endOfDay },
        expiresAt: { gt: new Date() },
        ...(sessionId ? { sessionId: { not: sessionId } } : {}),
      },
    });

    // Get all appointments for this staff on this date
    const appointments = await prisma.appointment.findMany({
      where: {
        salonId,
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
  } catch (error) {
    console.error("Get reservations error:", error);
    return NextResponse.json({ error: "Failed to get reservations" }, { status: 500 });
  }
}
