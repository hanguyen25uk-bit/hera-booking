import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendBookingConfirmation } from "@/lib/email";
import { validateBody, BookingSchema } from "@/lib/validations";
import { checkBookingRateLimit, getClientIP, getRateLimitHeaders, applyRateLimit } from "@/lib/rate-limit";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { withErrorHandler } from "@/lib/api-handler";
import { checkBotSubmission, getFakeSuccessResponse } from "@/lib/bot-protection";
import crypto from "crypto";
import { generatePublicId } from "@/lib/public-id";
import { getLocalDayRange } from "@/lib/timezone";

async function getDefaultSalonId() {
  return "heranailspa";
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const token = req.nextUrl.searchParams.get("token");

  // Token-based lookup is public (for manage-booking page)
  if (token) {
    const appointment = await prisma.appointment.findFirst({
      where: { manageToken: token },
      include: { service: true, staff: true, salon: { select: { slug: true } } },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json(appointment);
  }

  // All other GET requests require authentication
  const authPayload = await getAuthPayload();
  if (!authPayload) return unauthorizedResponse();
  const salonId = authPayload.salonId;

  const date = req.nextUrl.searchParams.get("date");

  const where: any = { salonId };
  if (date) {
    // Use salon-local day boundaries for filtering
    const dayRange = getLocalDayRange(date, "Europe/London");
    where.startTime = { gte: dayRange.start, lte: dayRange.end };
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
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Use auth salonId if logged in (admin walk-in), otherwise fall back to default (public booking)
  const authPayload = await getAuthPayload();
  const salonId = authPayload?.salonId || await getDefaultSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();

  // Extract bot protection fields before validation
  const { website, _formLoadedAt, ...cleanBody } = body;

  // 0. Bot protection check (only for public bookings, not admin walk-ins)
  if (!authPayload) {
    const botCheck = checkBotSubmission({ website, _formLoadedAt });
    if (botCheck.isBot) {
      return NextResponse.json(getFakeSuccessResponse('booking'));
    }
  }

  // 1. Validate input
  const validation = validateBody(BookingSchema, cleanBody);
  if (!validation.success) return validation.response;

  const { serviceId, staffId, customerName, customerPhone, customerEmail, startTime } = validation.data;

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
      publicId: generatePublicId(),
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
});
