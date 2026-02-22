import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { validateBookingInput } from "@/lib/validation";
import { checkBookingRateLimit, getClientIP, getRateLimitHeaders, applyRateLimit } from "@/lib/rate-limit";
import { sendBookingConfirmation } from "@/lib/email";
import { getApplicableDiscount, calculateDiscountedPrice, type Discount } from "@/lib/discount";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimit = applyRateLimit(req, "publicRead");
  if (!rateLimit.success) return rateLimit.response;

  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("token");
  
  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const appointment = await prisma.appointment.findFirst({
      where: { manageToken: token, salonId: salon.id },
      include: { service: true, staff: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Fetch appointment error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  try {
    const body = await req.json();

    // 1. Validate input
    const validation = validateBookingInput(body);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { serviceId, serviceIds, staffId, customerName, customerPhone, customerEmail, startTime, totalDuration: clientTotalDuration } = validation.sanitized!;
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

    // 6. Calculate times - use total duration from all services
    const start = new Date(startTime);
    const serverTotalDuration = allServices.reduce((sum, s) => sum + s.durationMinutes, 0);
    const finalDuration = clientTotalDuration || serverTotalDuration;
    const end = new Date(start.getTime() + finalDuration * 60000);

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

    // 8. Check for double booking
    const conflict = await prisma.appointment.findFirst({
      where: {
        salonId: salon.id,
        staffId,
        status: { notIn: ["cancelled", "no-show"] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "This time slot is no longer available." },
        { status: 409 }
      );
    }

    // 9. Create or get customer
    const manageToken = crypto.randomBytes(32).toString("hex");
    let customer = existingCustomer;

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          salonId: salon.id,
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
        },
      });
    }

    // 10. Create appointment with server-calculated prices
    const appointment = await prisma.appointment.create({
      data: {
        salonId: salon.id,
        serviceId, // Primary service for backward compatibility
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
      },
      include: { service: true, staff: true },
    });

    // 11. Clear slot reservation
    await prisma.slotReservation.deleteMany({
      where: { salonId: salon.id, staffId, startTime: start },
    });

    // 12. Send confirmation email with salon info and pricing
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
  } catch (error) {
    console.error("Create appointment error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
