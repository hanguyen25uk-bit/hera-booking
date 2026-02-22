import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";

async function getDefaultSalonId() {
  return "heranailspa";
}

export async function GET(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    const extras = await prisma.extra.findMany({
      where: { salonId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(extras);
  } catch (error) {
    console.error("Failed to fetch extras:", error);
    return NextResponse.json({ error: "Failed to fetch extras" }, { status: 500 });
  }
}
