import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const extras = await prisma.extra.findMany({
      where: { salonId: auth.salonId },
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
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        salonId: auth.salonId,
      },
    });

    return NextResponse.json(extra, { status: 201 });
  } catch (error) {
    console.error("Failed to create extra:", error);
    return NextResponse.json({ error: "Failed to create extra" }, { status: 500 });
  }
}
