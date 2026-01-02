import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      include: { serviceCategory: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Fetch services error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, durationMinutes, price, categoryId } = body;

    if (!name || !durationMinutes || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        durationMinutes: parseInt(durationMinutes),
        price: parseFloat(price),
        categoryId: categoryId || null,
      },
      include: { serviceCategory: true },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
