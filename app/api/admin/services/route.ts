import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, CreateServiceSchema } from "@/lib/validations";

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
  const validation = validateBody(CreateServiceSchema, body);
  if (!validation.success) return validation.response;

  const { name, description, durationMinutes, price, categoryId } = validation.data;

  const service = await prisma.service.create({
    data: {
      salonId: auth.salonId,
      name,
      description: description || null,
      durationMinutes,
      price,
      categoryId: categoryId || null,
    },
  });

  return NextResponse.json(service);
}
