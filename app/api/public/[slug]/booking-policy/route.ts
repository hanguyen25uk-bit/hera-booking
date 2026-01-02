import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  try {
    const policy = await prisma.bookingPolicy.findUnique({
      where: { salonId: salon.id },
    });

    if (!policy) {
      return NextResponse.json({
        title: "Booking Policy",
        policies: [],
      });
    }

    return NextResponse.json({
      title: policy.title,
      policies: JSON.parse(policy.policies),
    });
  } catch (error) {
    console.error("Fetch booking policy error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
