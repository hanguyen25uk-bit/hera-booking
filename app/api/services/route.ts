import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/admin-auth";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  return "heranailspa";
}

export async function GET() {
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






