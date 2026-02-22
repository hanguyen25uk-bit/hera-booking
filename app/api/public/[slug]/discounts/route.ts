import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimit = applyRateLimit(req, "publicRead");
  if (!rateLimit.success) return rateLimit.response;

  const { slug } = await params;

  try {
    const salon = await prisma.salon.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!salon) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    const now = new Date();

    // Get all active discounts for this salon that are within their validity period
    const discounts = await prisma.discount.findMany({
      where: {
        salonId: salon.id,
        isActive: true,
        AND: [
          // Discount hasn't expired (validUntil is null OR >= now)
          {
            OR: [
              { validUntil: null },
              { validUntil: { gte: now } },
            ],
          },
          // Discount has started (validFrom is null OR <= now)
          {
            OR: [
              { validFrom: null },
              { validFrom: { lte: now } },
            ],
          },
        ],
      },
    });

    // Return discounts with all info so frontend can calculate applicable discounts
    return NextResponse.json(discounts);
  } catch (error) {
    console.error("Get public discounts error:", error);
    return NextResponse.json({ error: "Failed to get discounts" }, { status: 500 });
  }
}
