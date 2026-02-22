import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  return "heranailspa";
}

export async function GET(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const salonId = await getSalonId();
    if (!salonId) {
      return NextResponse.json([]);
    }

    const services = await prisma.service.findMany({
      where: { isActive: true, salonId },
      include: { serviceCategory: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Fetch services error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}






