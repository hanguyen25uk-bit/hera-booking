import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

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
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, discountPercent, startTime, endTime, daysOfWeek, serviceIds, staffIds, isActive, validFrom, validUntil } = body;

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
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        salonId: auth.salonId,
      },
    });

    return NextResponse.json(discount);
  } catch (error) {
    console.error("Create discount error:", error);
    return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
  }
}
