import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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
      where: { salonId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(extras);
  } catch (error) {
    console.error("Failed to fetch extras:", error);
    return NextResponse.json({ error: "Failed to fetch extras" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, price, sortOrder = 0, isActive = true } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: "Name and price required" }, { status: 400 });
    }

    const extra = await prisma.extra.create({
      data: {
        name,
        price: parseFloat(price),
        sortOrder,
        isActive,
        salonId,
      },
    });

    return NextResponse.json(extra, { status: 201 });
  } catch (error) {
    console.error("Failed to create extra:", error);
    return NextResponse.json({ error: "Failed to create extra" }, { status: 500 });
  }
}
