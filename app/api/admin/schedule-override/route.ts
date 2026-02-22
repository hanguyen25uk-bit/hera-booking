import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) return unauthorizedResponse();

    const body = await req.json();
    const { staffId, date, isDayOff, startTime, endTime, note } = body;

    if (!staffId || !date) {
      return NextResponse.json({ error: "staffId and date required" }, { status: 400 });
    }

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
  } catch (error: any) {
    console.error("POST schedule-override error:", error);
    return NextResponse.json({ error: error.message || "Failed to save" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const body = await req.json();
  const { id, date, isDayOff, startTime, endTime, note } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

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
}

export async function DELETE(req: NextRequest) {
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
}
