import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Lấy danh sách ngày nghỉ/giờ custom của staff
export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  const month = req.nextUrl.searchParams.get("month"); // format: 2025-01
  
  try {
    const where: any = {};
    
    if (staffId) {
      where.staffId = staffId;
    }
    
    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }
    
    const overrides = await prisma.staffScheduleOverride.findMany({
      where,
      include: { staff: true },
      orderBy: { date: "asc" },
    });
    
    return NextResponse.json(overrides);
  } catch (error) {
    console.error("Fetch schedule overrides error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST - Tạo hoặc update ngày nghỉ/giờ custom
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId, date, isDayOff, startTime, endTime, note } = body;
    
    if (!staffId || !date) {
      return NextResponse.json({ error: "staffId and date required" }, { status: 400 });
    }
    
    const dateObj = new Date(date);
    
    // Upsert - tạo mới hoặc update nếu đã tồn tại
    const override = await prisma.staffScheduleOverride.upsert({
      where: {
        staffId_date: {
          staffId,
          date: dateObj,
        },
      },
      update: {
        isDayOff,
        startTime: isDayOff ? null : startTime,
        endTime: isDayOff ? null : endTime,
        note,
      },
      create: {
        staffId,
        date: dateObj,
        isDayOff,
        startTime: isDayOff ? null : startTime,
        endTime: isDayOff ? null : endTime,
        note,
      },
    });
    
    return NextResponse.json(override);
  } catch (error) {
    console.error("Create schedule override error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// DELETE - Xóa ngày nghỉ/giờ custom
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  
  try {
    await prisma.staffScheduleOverride.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete schedule override error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
