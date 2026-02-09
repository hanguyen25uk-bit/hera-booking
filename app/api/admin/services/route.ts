import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  // Fallback to heranailspa for development
  return "heranailspa";
}

export async function GET() {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json([]);

  const services = await prisma.service.findMany({
    where: { salonId },
    include: { serviceCategory: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return unauthorizedResponse();

  const body = await req.json();
  const { name, description, durationMinutes, price, categoryId } = body;

  if (!name || !durationMinutes || price === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      salonId,
      name,
      description: description || null,
      durationMinutes: parseInt(durationMinutes),
      price: parseFloat(price),
      categoryId: categoryId || null,
    },
  });

  return NextResponse.json(service);
}
