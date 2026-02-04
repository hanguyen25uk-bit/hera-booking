import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function getDefaultSalonId() {
  const salon = await prisma.salon.findFirst();
  return salon?.id;
}

export async function GET() {
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
