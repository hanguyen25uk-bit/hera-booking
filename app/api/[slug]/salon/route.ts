import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimit = applyRateLimit(req, "publicRead");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const { slug } = await params;

    const salon = await prisma.salon.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
      },
    });

    if (!salon) {
      return NextResponse.json(
        { error: "Salon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(salon);
  } catch (error) {
    console.error("Error fetching salon:", error);
    return NextResponse.json(
      { error: "Failed to fetch salon" },
      { status: 500 }
    );
  }
}
