import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// API để check staff có available trong ngày cụ thể không
export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  const date = req.nextUrl.searchParams.get("date"); // format: 2025-01-15
  
  if (!staffId || !date) {
    return NextResponse.json({ error: "staffId and date required" }, { status: 400 });
  }
  
  try {
    const dayOfWeek = new Date(date).getDay();
    
    // Check for schedule override (day off or custom hours)
    const override = await prisma.staffScheduleOverride.findFirst({
      where: {
        staffId,
        date: {
          gte: new Date(date + "T00:00:00.000Z"),
          lt: new Date(date + "T23:59:59.999Z"),
        },
      },
    });
    
    if (override) {
      if (override.isDayOff) {
        return NextResponse.json({
          available: false,
          reason: "dayoff",
          note: override.note,
        });
      } else {
        // Custom hours
        return NextResponse.json({
          available: true,
          startTime: override.startTime,
          endTime: override.endTime,
          isCustom: true,
          note: override.note,
        });
      }
    }
    
    // No override, check regular working hours
    const workingHours = await prisma.workingHours.findUnique({
      where: {
        staffId_dayOfWeek: {
          staffId,
          dayOfWeek,
        },
      },
    });
    
    if (!workingHours) {
      // No working hours set - return default hours
      return NextResponse.json({
        available: true,
        startTime: "10:00",
        endTime: "19:00",
        isCustom: false,
        isDefault: true,
      });
    }
    
    if (!workingHours.isWorking) {
      return NextResponse.json({
        available: false,
        reason: "not_working_day",
      });
    }
    
    return NextResponse.json({
      available: true,
      startTime: workingHours.startTime,
      endTime: workingHours.endTime,
      isCustom: false,
    });
  } catch (error) {
    console.error("Check availability error:", error);
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 });
  }
}
