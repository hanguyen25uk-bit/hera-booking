import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, UpdateCategorySchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

export const PUT = withErrorHandler(async (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const { id } = await context!.params;

  const body = await req.json();
  const validation = validateBody(UpdateCategorySchema, body);
  if (!validation.success) return validation.response;

  const category = await prisma.serviceCategory.update({
    where: { id },
    data: validation.data,
  });
  return NextResponse.json(category);
});

export const DELETE = withErrorHandler(async (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const { id } = await context!.params;

  await prisma.service.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.serviceCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
