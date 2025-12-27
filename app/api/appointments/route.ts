import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendBookingConfirmation } from "@/lib/email";
import crypto from "crypto";
import { validateBookingInput } from "@/lib/validation";
import { checkBookingRateLimit, getClientIP, getRateLimitHeaders } from "@/lib/rate-limit";

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
    const where: Record<string, unknown> = {};
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
    
    // Input Validation
    const validation = validateBookingInput(body);
    if (!validation.isValid) {
      return NextResponse.json({ error: "Validation failed", details: validation.errors }, { status: 400 });
    }
    const { serviceId, staffId, customerName, customerPhone, customerEmail, startTime } = validation.sanitized!;
    
    // Rate Limiting
    const clientIP = getClientIP(req);
    const rateLimitResult = checkBookingRateLimit(clientIP, customerEmail);
    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      return NextResponse.json({ error: "Too many booking attempts. Please try again later.", retryAfter: rateLimitResult.retryAfter }, { status: 429, headers });
    }

    // Check if customer is blocked
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: customerEmail },
    });
    if (existingCustomer?.isBlocked) {
      return NextResponse.json({ error: "You cannot book the appointment as you have been no show 3 times." }, { status: 403 });
    }

    // Get service
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Get staff
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }
    if (!staff.active) {
      return NextResponse.json({ error: "Staff member is not available" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    // Double Booking Prevention with Transaction
    const appointment = await prisma.$transaction(async (tx) => {
      const conflictingAppointment = await tx.appointment.findFirst({
        where: {
          staffId: staffId,
          status: { not: "cancelled" },
          OR: [
            { startTime: { lte: start }, endTime: { gt: start } },
            { startTime: { lt: end }, endTime: { gte: end } },
            { startTime: { gte: start }, endTime: { lte: end } },
          ],
        },
      });
      if (conflictingAppointment) {
        throw new Error("DOUBLE_BOOKING");
      }
      let customer = existingCustomer;
      if (!customer) {
        customer = await tx.customer.create({
          data: { email: customerEmail, name: customerName, phone: customerPhone },
        });
      }
      const manageToken = crypto.randomBytes(32).toString("hex");
      return await tx.appointment.create({
        data: {
          serviceId, staffId, customerId: customer.id,
          customerName, customerPhone, customerEmail,
          startTime: start, endTime: end, manageToken,
        },
        include: { service: true, staff: true },
      });
    });

    // Send email
    try {
      await sendBookingConfirmation({
        customerEmail, customerName,
        serviceName: service.name, staffName: staff.name,
        startTime: start, endTime: end,
        bookingId: appointment.id, manageToken: appointment.manageToken!,
      });
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
    }

    const headers = getRateLimitHeaders(rateLimitResult);
    return NextResponse.json(appointment, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === "DOUBLE_BOOKING") {
      return NextResponse.json({ error: "This time slot is no longer available. Please select another time.", code: "DOUBLE_BOOKING" }, { status: 409 });
    }
    console.error("Create appointment error:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
