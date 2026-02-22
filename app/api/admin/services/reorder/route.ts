import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, ReorderServicesSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const body = await req.json();
  const validation = validateBody(ReorderServicesSchema, body);
  if (!validation.success) return validation.response;

  const { serviceIds } = validation.data;

  // Update sortOrder for each service
  await prisma.$transaction(
    serviceIds.map((id: string, index: number) =>
      prisma.service.update({
        where: { id, salonId: auth.salonId },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ success: true });
});
