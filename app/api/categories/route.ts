import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function getDefaultSalonId() {
  const salon = await prisma.salon.findFirst();
  return salon?.id;
}

export async function GET() {
  const salonId = await getDefaultSalonId();
  if (!salonId) return NextResponse.json([]);

  const categories = await prisma.serviceCategory.findMany({
    where: { salonId },
    include: { services: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const salonId = await getDefaultSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();
  const { name, description, sortOrder } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const category = await prisma.serviceCategory.create({
    data: {
      salonId,
      name,
      description: description || null,
      sortOrder: sortOrder || 0,
    },
  });

  return NextResponse.json(category);
}

export async function PUT(req: NextRequest) {
  const salonId = await getDefaultSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();
  const { id, name, description, sortOrder } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const category = await prisma.serviceCategory.update({
    where: { id },
    data: {
      name,
      description: description || null,
      sortOrder: sortOrder || 0,
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.serviceCategory.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
