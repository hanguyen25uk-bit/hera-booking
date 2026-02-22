import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, WorkingHoursSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const staffId = req.nextUrl.searchParams.get("staffId");

  const where: any = { salonId: auth.salonId };
  if (staffId) where.staffId = staffId;

  const workingHours = await prisma.workingHours.findMany({
    where,
    include: { staff: true },
    orderBy: [{ staffId: "asc" }, { dayOfWeek: "asc" }],
  });

  return NextResponse.json(workingHours);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const body = await req.json();
  const validation = validateBody(WorkingHoursSchema, body);
  if (!validation.success) return validation.response;

  const { staffId, dayOfWeek, startTime, endTime, isWorking } = validation.data;

  const workingHours = await prisma.workingHours.upsert({
    where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
    create: {
      salonId: auth.salonId,
      staffId,
      dayOfWeek,
      startTime: startTime || "09:00",
      endTime: endTime || "17:00",
      isWorking: isWorking ?? true,
    },
    update: {
      startTime: startTime || "09:00",
      endTime: endTime || "17:00",
      isWorking: isWorking ?? true,
    },
  });

  return NextResponse.json(workingHours);
});
