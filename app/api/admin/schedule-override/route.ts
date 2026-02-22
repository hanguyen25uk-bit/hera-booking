import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, CreateScheduleOverrideSchema, UpdateScheduleOverrideSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const staffId = req.nextUrl.searchParams.get("staffId");
  const month = req.nextUrl.searchParams.get("month");

  const where: any = { salonId: auth.salonId };
  if (staffId) where.staffId = staffId;
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0);
    where.date = { gte: startDate, lte: endDate };
  }

  const overrides = await prisma.staffScheduleOverride.findMany({
    where,
    include: { staff: true },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(overrides);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const body = await req.json();
  const validation = validateBody(CreateScheduleOverrideSchema, body);
  if (!validation.success) return validation.response;

  const { staffId, date, isDayOff, startTime, endTime, note } = validation.data;

  // Parse date and set to midnight UTC to avoid timezone issues
  const dateObj = new Date(date + "T00:00:00.000Z");

  const override = await prisma.staffScheduleOverride.upsert({
    where: { staffId_date: { staffId, date: dateObj } },
    create: {
      salonId: auth.salonId,
      staffId,
      date: dateObj,
      isDayOff: isDayOff ?? false,
      startTime: startTime || null,
      endTime: endTime || null,
      note: note || null,
    },
    update: {
      isDayOff: isDayOff ?? false,
      startTime: startTime || null,
      endTime: endTime || null,
      note: note || null,
    },
  });

  return NextResponse.json(override);
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const body = await req.json();
  const validation = validateBody(UpdateScheduleOverrideSchema, body);
  if (!validation.success) return validation.response;

  const { id, date, isDayOff, startTime, endTime, note } = validation.data;

  const dateObj = date ? new Date(date) : undefined;

  const override = await prisma.staffScheduleOverride.update({
    where: { id },
    data: {
      ...(dateObj && { date: dateObj }),
      isDayOff: isDayOff ?? false,
      startTime: startTime || null,
      endTime: endTime || null,
      note: note || null,
    },
  });

  return NextResponse.json(override);
});

export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.staffScheduleOverride.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
