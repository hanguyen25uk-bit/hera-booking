import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendBookingConfirmation } from "@/lib/email";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const token = req.nextUrl.searchParams.get("token");
  
  try {
    if (token) {
      const appointment = await prisma.appointment.findFirst({
        where: { manageToken: token },
        include: { service: true, staff: true },
      });
      
      if (!appointment) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      
      return NextResponse.json(appointment);
    }

    const where: any = {};
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.startTime = { gte: start, lte: end };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: { service: true, staff: true },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Fetch appointments error:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceId, staffId, customerName, customerPhone, customerEmail, startTime } = body;

    const emailLower = customerEmail.toLowerCase();

    const existingCustomer = await prisma.customer.findUnique({
      where: { email: emailLower },
    });

    if (existingCustomer?.isBlocked) {
      return NextResponse.json(
        { error: "You cannot book the appointment as you have been no show 3 times." },
        { status: 403 }
      );
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);
    const manageToken = crypto.randomBytes(32).toString("hex");

    let customer = existingCustomer;
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: emailLower,
          name: customerName,
          phone: customerPhone,
        },
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        serviceId,
        staffId,
        customerId: customer.id,
        customerName,
        customerPhone,
        customerEmail: emailLower,
        startTime: start,
        endTime: end,
        manageToken,
        status: "confirmed",
      },
      include: { service: true, staff: true },
    });

    try {
      const emailResult = await sendBookingConfirmation({
        customerEmail: emailLower,
        customerName,
        serviceName: service.name,
        staffName: staff.name,
        startTime: start,
        endTime: end,
        bookingId: appointment.id,
        manageToken,
      });
      console.log("Email result:", emailResult);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Create appointment error:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
