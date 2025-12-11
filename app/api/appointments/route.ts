import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/email";



// GET appointments (by date OR by token)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const dateParam = searchParams.get("date");

    // If token provided, return single appointment
    if (token) {
      const appointment = await prisma.appointment.findFirst({
        where: { manageToken: token },
        include: {
          service: true,
          staff: true,
        },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(appointment);
    }

    // Otherwise return list with optional date filter
    let whereClause = {};

    if (dateParam) {
      const startOfDay = new Date(dateParam);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(dateParam);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause = {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      orderBy: { startTime: "asc" },
      include: {
        service: true,
        staff: true,
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json(
      { error: "Failed to load appointments" },
      { status: 500 }
    );
  }
}

// POST - Create new appointment
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceId, staffId, customerName, customerPhone, customerEmail, startTime } = body;

    // Validate required fields
    if (!serviceId || !staffId || !customerName || !customerPhone || !customerEmail || !startTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get service to calculate endTime
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    // Generate manage token
    const manageToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);

    const newAppointment = await prisma.appointment.create({
      data: {
        serviceId,
        staffId,
        customerName,
        customerPhone,
        customerEmail,
        startTime: start,
        endTime: end,
        manageToken,
      },
      include: {
        service: true,
        staff: true,
      },
    });

    // Send confirmation email
    try {
      await sendBookingConfirmation({
        customerEmail: newAppointment.customerEmail,
        customerName: newAppointment.customerName,
        serviceName: newAppointment.service.name,
        staffName: newAppointment.staff.name,
        startTime: newAppointment.startTime,
        endTime: newAppointment.endTime,
        bookingId: newAppointment.id,
        manageToken: newAppointment.manageToken || "",
      });
      console.log("✅ Confirmation email sent");
    } catch (emailError) {
      console.error("⚠️ Failed to send email:", emailError);
    }

    return NextResponse.json(newAppointment);
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}