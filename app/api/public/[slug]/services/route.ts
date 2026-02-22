import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { applyRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimit = applyRateLimit(req, "publicRead");
  if (!rateLimit.success) return rateLimit.response;

  const { slug } = await params;

  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  try {
    const services = await prisma.service.findMany({
      where: { salonId: salon.id, isActive: true },
      include: { serviceCategory: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Fetch services error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
