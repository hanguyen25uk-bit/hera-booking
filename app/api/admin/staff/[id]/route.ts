import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, UpdateStaffSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

export const PUT = withErrorHandler(async (req: NextRequest, context) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

  const { id } = await context!.params;
  const body = await req.json();
  const validation = validateBody(UpdateStaffSchema, body);
  if (!validation.success) return validation.response;

  const staff = await prisma.staff.update({
    where: { id },
    data: validation.data,
  });
  return NextResponse.json(staff);
});

export const DELETE = withErrorHandler(async (req: NextRequest, context) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

  const { id } = await context!.params;
  await prisma.staff.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
