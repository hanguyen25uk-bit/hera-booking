import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendBookingConfirmation } from "@/lib/email";
import { validateBookingInput } from "@/lib/validation";
import { checkBookingRateLimit, getClientIP, getRateLimitHeaders, applyRateLimit } from "@/lib/rate-limit";
import { getAuthPayload } from "@/lib/admin-auth";
import crypto from "crypto";

async function getDefaultSalonId() {
  return "heranailspa";
}

export async function GET(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;
  // Use auth salonId if logged in, otherwise fall back to default
  const authPayload = await getAuthPayload();
  const salonId = authPayload?.salonId || await getDefaultSalonId();
  if (!salonId) return NextResponse.json([]);

  const date = req.nextUrl.searchParams.get("date");
  const token = req.nextUrl.searchParams.get("token");

  try {
    if (token) {
      // Token lookup doesn't need salonId filter - token is unique
      const appointment = await prisma.appointment.findFirst({
        where: { manageToken: token },
        include: { service: true, staff: true, salon: { select: { slug: true } } },
      });

      if (!appointment) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      return NextResponse.json(appointment);
    }

    const where: any = { salonId };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.startTime = { gte: start, lte: end };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        servicesJson: true,
        service: { select: { id: true, name: true, durationMinutes: true, price: true } },
        staff: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Fetch appointments error:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Use auth salonId if logged in (admin walk-in), otherwise fall back to default (public booking)
  const authPayload = await getAuthPayload();
  const salonId = authPayload?.salonId || await getDefaultSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  try {
    const body = await req.json();

    // 1. Validate input
    const validation = validateBookingInput(body);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { serviceId, staffId, customerName, customerPhone, customerEmail, startTime } = validation.sanitized!;

    // 2. Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitResult = checkBookingRateLimit(clientIP, customerEmail);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Too many booking attempts. Please try again in ${rateLimitResult.retryAfter} seconds.` },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // 3. Check if customer is blocked
    const existingCustomer = await prisma.customer.findUnique({
      where: { salonId_email: { salonId, email: customerEmail.toLowerCase() } },
    });

    if (existingCustomer?.isBlocked) {
      return NextResponse.json(
        { error: "You cannot book the appointment as you have been no show 3 times." },
        { status: 403 }
      );
    }

    // 4. Validate service exists
    const service = await prisma.service.findFirst({ where: { id: serviceId, salonId } });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // 5. Validate staff exists
    const staff = await prisma.staff.findFirst({ where: { id: staffId, salonId } });
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // 6. Calculate times
    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    // 7. Check for double booking
    const conflict = await prisma.appointment.findFirst({
      where: {
        salonId,
        staffId,
        status: { notIn: ["cancelled", "no-show"] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please choose another time." },
        { status: 409 }
      );
    }

    // 8. Create or get customer
    const manageToken = crypto.randomBytes(32).toString("hex");
    let customer = existingCustomer;

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          salonId,
          email: customerEmail.toLowerCase(),
          name: customerName,
          phone: customerPhone,
        },
      });
    }

    // 9. Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        salonId,
        serviceId,
        staffId,
        customerId: customer.id,
        customerName,
        customerPhone,
        customerEmail,
        startTime: start,
        endTime: end,
        manageToken,
        status: "confirmed",
      },
      include: { service: true, staff: true, salon: true },
    });

    // 10. Send confirmation email
    try {
      await sendBookingConfirmation({
        customerEmail,
        customerName,
        serviceName: service.name,
        staffName: staff.name,
        startTime: start,
        endTime: end,
        bookingId: appointment.id,
        manageToken,
        salonName: appointment.salon.name,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Create appointment error:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
