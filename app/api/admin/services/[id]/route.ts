import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, UpdateServiceSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

export const PUT = withErrorHandler(async (req: NextRequest, context) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

  const { id } = await context!.params;
  const body = await req.json();
  const validation = validateBody(UpdateServiceSchema, body);
  if (!validation.success) return validation.response;

  const { name, description, durationMinutes, price, categoryId, isActive } = validation.data;

  const service = await prisma.service.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(durationMinutes !== undefined && { durationMinutes }),
      ...(price !== undefined && { price }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { serviceCategory: true },
  });

  return NextResponse.json(service);
});

export const DELETE = withErrorHandler(async (req: NextRequest, context) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

  const { id } = await context!.params;
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
