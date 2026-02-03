import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";

export async function GET() {
  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discounts = await prisma.discount.findMany({
      where: { salonId: auth.salonId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(discounts);
  } catch (error) {
    console.error("Get discounts error:", error);
    return NextResponse.json({ error: "Failed to get discounts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, discountPercent, startTime, endTime, daysOfWeek, serviceIds, staffIds, isActive } = body;

    if (!name || !discountPercent || !startTime || !endTime || !daysOfWeek || !serviceIds) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const discount = await prisma.discount.create({
      data: {
        name,
        discountPercent: parseInt(discountPercent),
        startTime,
        endTime,
        daysOfWeek,
        serviceIds,
        staffIds: staffIds || [],
        isActive: isActive !== false,
        salonId: auth.salonId,
      },
    });

    return NextResponse.json(discount);
  } catch (error) {
    console.error("Create discount error:", error);
    return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
  }
}
