import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { validateBody, BookingSchema } from "@/lib/validations";
import { checkBookingRateLimit, getClientIP, getRateLimitHeaders, applyRateLimit } from "@/lib/rate-limit";
import { sendBookingConfirmation } from "@/lib/email";
import { getApplicableDiscount, calculateDiscountedPrice, type Discount } from "@/lib/discount";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { checkBotSubmission, getFakeSuccessResponse } from "@/lib/bot-protection";
import { differenceInHours, subHours } from "date-fns";
import crypto from "crypto";
import { generatePublicId } from "@/lib/public-id";

class SlotTakenError extends Error {
  constructor() { super("Slot taken"); this.name = "SlotTakenError"; }
}

function isPrismaError(e: unknown): e is { code: string; meta?: Record<string, unknown> } {
  return typeof e === "object" && e !== null && "code" in e && typeof (e as { code: unknown }).code === "string";
}

export const GET = withErrorHandler(async (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const rateLimit = applyRateLimit(req, "publicRead");
  if (!rateLimit.success) return rateLimit.response;

  const { slug } = await context!.params;
  const token = req.nextUrl.searchParams.get("token");

  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findFirst({
    where: { manageToken: token, salonId: salon.id },
    include: { service: true, staff: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json(appointment);
});

export const POST = withErrorHandler(async (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { slug } = await context!.params;

  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  const body = await req.json();

  // Extract and check bot protection fields before validation
  const { website, _formLoadedAt, ...cleanBody } = body;
  const botCheck = checkBotSubmission({ website, _formLoadedAt });
  if (botCheck.isBot) {
    return NextResponse.json(getFakeSuccessResponse('booking'));
  }

  // 1. Validate input
  const validation = validateBody(BookingSchema, cleanBody);
  if (!validation.success) return validation.response;

  const { serviceId, serviceIds, staffId, customerName, customerPhone, customerEmail, startTime } = validation.data;
  const allServiceIds = serviceIds || [serviceId];

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
    where: { salonId_email: { salonId: salon.id, email: customerEmail } },
  });

  if (existingCustomer?.isBlocked) {
    return NextResponse.json(
      { error: "You cannot book as you have been no-show 3 times." },
      { status: 403 }
    );
  }

  // 4. Validate all services exist
  const allServices = await prisma.service.findMany({
    where: { id: { in: allServiceIds }, salonId: salon.id },
    include: { serviceCategory: true },
  });
  if (allServices.length !== allServiceIds.length) {
    return NextResponse.json({ error: "One or more services not found" }, { status: 404 });
  }

  // Primary service (first selected) for backward compatibility
  const service = allServices.find(s => s.id === serviceId) || allServices[0];

  // 5. Validate staff exists
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, salonId: salon.id },
  });
  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  // 6. Calculate times - always use server-calculated duration (never trust client)
  const start = new Date(startTime);
  const totalDuration = allServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const end = new Date(start.getTime() + totalDuration * 60000);

  // 7. Calculate pricing server-side (never trust frontend prices)
  const originalPrice = allServices.reduce((sum, s) => sum + s.price, 0);

  // Prepare services JSON for storage
  const servicesJsonData = allServices.map(s => ({
    id: s.id,
    name: s.name,
    price: s.price,
    durationMinutes: s.durationMinutes,
    categoryName: s.serviceCategory?.name || null,
  }));
  let discountedPrice: number | null = null;
  let discountName: string | null = null;

  // Fetch active discounts and check if any apply
  const now = new Date();
  const activeDiscounts = await prisma.discount.findMany({
    where: {
      salonId: salon.id,
      isActive: true,
      OR: [
        { validFrom: null, validUntil: null },
        { validFrom: { lte: now }, validUntil: null },
        { validFrom: null, validUntil: { gte: now } },
        { validFrom: { lte: now }, validUntil: { gte: now } },
      ],
    },
  });

  // Format time as HH:MM for discount check
  const timeStr = start.toTimeString().slice(0, 5);

  // Find applicable discount (for multi-service, check primary service)
  const applicableDiscount = getApplicableDiscount(
    activeDiscounts as Discount[],
    serviceId,
    start,
    timeStr,
    staffId
  );

  if (applicableDiscount) {
    discountedPrice = calculateDiscountedPrice(originalPrice, applicableDiscount);
    discountName = applicableDiscount.name;
  }

  // 8. Atomic transaction: conflict check + create customer + create appointment + clear reservation
  const manageToken = crypto.randomBytes(32).toString("hex");
  const hoursUntilAppointment = differenceInHours(start, now);
  const reminder24hScheduledFor = hoursUntilAppointment > 24
    ? subHours(start, 24)
    : null;

  let appointment;
  try {
    appointment = await prisma.$transaction(async (tx) => {
      // 8a. Check for double booking (inside transaction to close TOCTOU window)
      const conflict = await tx.appointment.findFirst({
        where: {
          salonId: salon.id,
          staffId,
          status: { notIn: ["cancelled", "no-show"] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });

      if (conflict) {
        throw new SlotTakenError();
      }

      // 8b. Create or get customer
      let customer = existingCustomer;
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            salonId: salon.id,
            email: customerEmail,
            name: customerName,
            phone: customerPhone,
          },
        });
      }

      // 8c. Create appointment (DB exclusion constraint is the final safety net)
      const appt = await tx.appointment.create({
        data: {
          publicId: generatePublicId(),
          salonId: salon.id,
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
          originalPrice,
          discountedPrice,
          discountName,
          servicesJson: allServices.length > 1 ? JSON.stringify(servicesJsonData) : null,
          reminder24hScheduledFor,
        },
        include: { service: true, staff: true },
      });

      // 8d. Clear slot reservation
      await tx.slotReservation.deleteMany({
        where: { salonId: salon.id, staffId, startTime: start },
      });

      return appt;
    }, {
      isolationLevel: "Serializable",
      maxWait: 5000,
      timeout: 10000,
    });
  } catch (e: unknown) {
    if (e instanceof SlotTakenError) {
      return NextResponse.json(
        { error: "This time slot is no longer available.", code: "SLOT_TAKEN" },
        { status: 409 }
      );
    }
    // Prisma exclusion constraint violation (race condition caught by DB)
    if (isPrismaError(e) && e.code === "P2002") {
      return NextResponse.json(
        { error: "This time slot is no longer available.", code: "SLOT_TAKEN" },
        { status: 409 }
      );
    }
    // Serialization failure — client should retry
    if (isPrismaError(e) && e.code === "P2034") {
      return NextResponse.json(
        { error: "Booking conflict, please try again.", code: "RETRY" },
        { status: 503 }
      );
    }
    throw e; // Re-throw unexpected errors to withErrorHandler
  }

  // 9. Send confirmation email (outside transaction — non-critical)
  try {
    await sendBookingConfirmation({
      customerEmail,
      customerName,
      serviceName: service.name,
      serviceNames: allServices.length > 1 ? allServices.map(s => s.name) : undefined,
      services: allServices.map(s => ({
        name: s.name,
        price: s.price,
        durationMinutes: s.durationMinutes,
      })),
      staffName: staff.name,
      startTime: start,
      endTime: end,
      bookingId: appointment.id,
      manageToken,
      salonName: salon.name,
      salonPhone: salon.phone || "",
      salonAddress: salon.address || "",
      salonSlug: salon.slug,
      originalPrice,
      discountedPrice: discountedPrice ?? undefined,
      discountName: discountName ?? undefined,
      discountPercent: applicableDiscount?.discountPercent,
    });
  } catch (emailError) {
    console.error("Failed to send confirmation email:", emailError);
  }

  return NextResponse.json(appointment);
});
