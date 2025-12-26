import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const service = await prisma.service.create({
      data: {
        name: body.name,
        durationMinutes: Number(body.durationMinutes),
        price: Number(body.price),
        category: body.category || null,
      },
    });
    return NextResponse.json(service);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
