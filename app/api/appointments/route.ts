import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  
  try {
    const where: any = {};
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: true,
        staff: true,
      },
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

    // Check if customer is blocked
    const customer = await prisma.customer.findUnique({
      where: { email: customerEmail },
    });

    if (customer?.isBlocked) {
      return NextResponse.json(
        { error: "This email address has been blocked due to multiple no-shows. Please contact the salon directly." },
        { status: 403 }
      );
    }

    // Get service to calculate end time
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    // Check for conflicts
    const conflict = await prisma.appointment.findFirst({
      where: {
        staffId,
        status: { notIn: ["cancelled", "no-show"] },
        OR: [
          { startTime: { lt: end }, endTime: { gt: start } },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }

    // Generate manage token
    const manageToken = crypto.randomBytes(32).toString("hex");

    // Create or update customer record
    let customerId: string | null = null;
    if (customer) {
      customerId = customer.id;
    } else {
      const newCustomer = await prisma.customer.create({
        data: {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
        },
      });
      customerId = newCustomer.id;
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        serviceId,
        staffId,
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        startTime: start,
        endTime: end,
        status: "confirmed",
        manageToken,
      },
      include: {
        service: true,
        staff: true,
      },
    });

    // TODO: Send confirmation email

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Create appointment error:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
