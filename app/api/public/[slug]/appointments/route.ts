import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { validateBookingInput } from "@/lib/validation";
import { checkBookingRateLimit, getClientIP, getRateLimitHeaders } from "@/lib/rate-limit";
import { sendBookingConfirmation } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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
      where: { salonId_email: { salonId: salon.id, email: customerEmail } },
    });

    if (existingCustomer?.isBlocked) {
      return NextResponse.json(
        { error: "You cannot book as you have been no-show 3 times." },
        { status: 403 }
      );
    }

    // 4. Validate service exists
    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId: salon.id },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // 5. Validate staff exists
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, salonId: salon.id },
    });
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // 6. Calculate times
    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    // 7. Check for double booking
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

    // 8. Create or get customer
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

    // 9. Create appointment
    const appointment = await prisma.appointment.create({
      data: {
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
      },
      include: { service: true, staff: true },
    });

    // 10. Clear slot reservation
    await prisma.slotReservation.deleteMany({
      where: { salonId: salon.id, staffId, startTime: start },
    });

    // 11. Send confirmation email with salon info
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
        salonName: salon.name,
        salonPhone: salon.phone || "",
        salonAddress: salon.address || "",
        salonSlug: salon.slug,
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
