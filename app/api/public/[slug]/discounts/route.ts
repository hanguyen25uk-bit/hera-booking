import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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
        // Only include discounts that haven't expired
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } },
        ],
        // Only include discounts that have started (or have no start date)
        AND: [
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
