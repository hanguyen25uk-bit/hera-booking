import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, CreateDiscountSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const discounts = await prisma.discount.findMany({
    where: { salonId: auth.salonId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(discounts);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = validateBody(CreateDiscountSchema, body);
  if (!validation.success) return validation.response;

  const { name, discountPercent, startTime, endTime, daysOfWeek, serviceIds, staffIds, isActive, validFrom, validUntil } = validation.data;

  const discount = await prisma.discount.create({
    data: {
      name,
      discountPercent,
      startTime,
      endTime,
      daysOfWeek,
      serviceIds,
      staffIds: staffIds || [],
      isActive: isActive !== false,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      salonId: auth.salonId,
    },
  });

  return NextResponse.json(discount);
});
