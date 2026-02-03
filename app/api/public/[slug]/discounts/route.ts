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

    // Get all active discounts for this salon
    const discounts = await prisma.discount.findMany({
      where: {
        salonId: salon.id,
        isActive: true,
      },
    });

    // Return discounts with all info so frontend can calculate applicable discounts
    return NextResponse.json(discounts);
  } catch (error) {
    console.error("Get public discounts error:", error);
    return NextResponse.json({ error: "Failed to get discounts" }, { status: 500 });
  }
}
