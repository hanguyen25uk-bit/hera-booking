import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all services
export async function GET() {
  const services = await prisma.service.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(services);
}

// CREATE a new service
export async function POST(req: Request) {
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
}
