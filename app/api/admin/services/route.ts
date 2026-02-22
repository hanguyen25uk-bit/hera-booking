import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const services = await prisma.service.findMany({
    where: { salonId: auth.salonId },
    include: {
      serviceCategory: true,
      staffServices: {
        include: {
          staff: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const body = await req.json();
  const { name, description, durationMinutes, price, categoryId } = body;

  if (!name || !durationMinutes || price === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      salonId: auth.salonId,
      name,
      description: description || null,
      durationMinutes: parseInt(durationMinutes),
      price: parseFloat(price),
      categoryId: categoryId || null,
    },
  });

  return NextResponse.json(service);
}
