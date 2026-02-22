import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, CreateCategorySchema, UpdateCategorySchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  return "heranailspa";
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json([]);

  const categories = await prisma.serviceCategory.findMany({
    where: { salonId },
    include: { services: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(categories);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();
  const validation = validateBody(CreateCategorySchema, body);
  if (!validation.success) return validation.response;

  const { name, description, sortOrder } = validation.data;

  const category = await prisma.serviceCategory.create({
    data: {
      salonId,
      name,
      description: description || null,
      sortOrder: sortOrder || 0,
    },
  });

  return NextResponse.json(category);
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();
  const validation = validateBody(UpdateCategorySchema, body);
  if (!validation.success) return validation.response;

  const { id, name, description, sortOrder } = validation.data;

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
});

export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.serviceCategory.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
