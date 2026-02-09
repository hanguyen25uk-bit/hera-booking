import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  return "heranailspa";
}

export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  const month = req.nextUrl.searchParams.get("month");

  const salonId = await getSalonId();
  if (!salonId) {
    return NextResponse.json([]);
  }

  const where: any = { salonId };
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
  const salonId = await getSalonId();
  if (!salonId) return unauthorizedResponse();

  const body = await req.json();
  const { staffId, date, isDayOff, startTime, endTime, note } = body;

  if (!staffId || !date) {
    return NextResponse.json({ error: "staffId and date required" }, { status: 400 });
  }

  const dateObj = new Date(date);

  const override = await prisma.staffScheduleOverride.upsert({
    where: { staffId_date: { staffId, date: dateObj } },
    create: {
      salonId,
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
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.staffScheduleOverride.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
