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
  const staffId = req.nextUrl.searchParams.get("staffId");

  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  try {
    const where: any = { salonId: salon.id };
    if (staffId) where.staffId = staffId;

    const workingHours = await prisma.workingHours.findMany({
      where,
      include: { staff: true },
      orderBy: [{ staffId: "asc" }, { dayOfWeek: "asc" }],
    });

    return NextResponse.json(workingHours);
  } catch (error) {
    console.error("Fetch working hours error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
