import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, UpdateDiscountSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

export const PUT = withErrorHandler(async (req: NextRequest, context) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const { id } = await context!.params;

  const auth = await getAuthPayload();
  if (!auth?.salonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify discount belongs to this salon
  const existing = await prisma.discount.findFirst({
    where: { id, salonId: auth.salonId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Discount not found" }, { status: 404 });
  }

  const body = await req.json();
  const validation = validateBody(UpdateDiscountSchema, body);
  if (!validation.success) return validation.response;

  const { name, discountPercent, startTime, endTime, daysOfWeek, serviceIds, staffIds, isActive, validFrom, validUntil } = validation.data;

  const discount = await prisma.discount.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(discountPercent !== undefined && { discountPercent }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(daysOfWeek !== undefined && { daysOfWeek }),
      ...(serviceIds !== undefined && { serviceIds }),
      ...(staffIds !== undefined && { staffIds }),
      ...(isActive !== undefined && { isActive }),
      ...(validFrom !== undefined && { validFrom: validFrom ? new Date(validFrom) : null }),
      ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
    },
  });

  return NextResponse.json(discount);
});

export const DELETE = withErrorHandler(async (req: NextRequest, context) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const { id } = await context!.params;

  const auth = await getAuthPayload();
  if (!auth?.salonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify discount belongs to this salon
  const existing = await prisma.discount.findFirst({
    where: { id, salonId: auth.salonId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Discount not found" }, { status: 404 });
  }

  await prisma.discount.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
