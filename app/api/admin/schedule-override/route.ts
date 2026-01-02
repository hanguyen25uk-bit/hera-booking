import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  const staffId = req.nextUrl.searchParams.get("staffId");

  try {
    const where = staffId ? { staffId } : {};
    const overrides = await prisma.staffScheduleOverride.findMany({
      where,
      include: { staff: true },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(overrides);
  } catch (error) {
    console.error("Fetch overrides error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { staffId, date, isDayOff, startTime, endTime, note } = body;

    if (!staffId || !date) {
      return NextResponse.json({ error: "Staff and date required" }, { status: 400 });
    }

    const dateObj = new Date(date);

    const override = await prisma.staffScheduleOverride.upsert({
      where: { staffId_date: { staffId, date: dateObj } },
      create: {
        staffId,
        date: dateObj,
        isDayOff: isDayOff ?? false,
        startTime: isDayOff ? null : startTime,
        endTime: isDayOff ? null : endTime,
        note,
      },
      update: {
        isDayOff: isDayOff ?? false,
        startTime: isDayOff ? null : startTime,
        endTime: isDayOff ? null : endTime,
        note,
      },
    });

    return NextResponse.json(override);
  } catch (error) {
    console.error("Save override error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.staffScheduleOverride.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete override error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
