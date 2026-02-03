import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getDefaultSalonId() {
  const salon = await prisma.salon.findFirst();
  return salon?.id;
}

export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  const date = req.nextUrl.searchParams.get("date");
  
  if (!staffId || !date) {
    return NextResponse.json({ error: "staffId and date required" }, { status: 400 });
  }
  
  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    // Verify staff belongs to this salon
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, salonId },
    });
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Parse date correctly - use local date parts to get day of week
    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    const dayOfWeek = localDate.getDay();
    
    // Create date object at midnight UTC for exact match
    const targetDate = new Date(date + "T00:00:00.000Z");
    
    // Check for schedule override using exact date match
    const override = await prisma.staffScheduleOverride.findUnique({
      where: {
        staffId_date: {
          staffId,
          date: targetDate,
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
      // No working hours set - default to working 10:00-19:00 on weekdays
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      return NextResponse.json({
        available: !isWeekend,
        startTime: "10:00",
        endTime: "19:00",
        isDefault: true,
        reason: isWeekend ? "weekend" : undefined,
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
      startTime: workingHours.startTime || "10:00",
      endTime: workingHours.endTime || "19:00",
    });
  } catch (error) {
    console.error("Check availability error:", error);
    return NextResponse.json({ error: "Failed to check" }, { status: 500 });
  }
}
