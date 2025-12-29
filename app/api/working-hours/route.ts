import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  const date = req.nextUrl.searchParams.get("date"); // format: 2025-01-15
  
  try {
    // If date is provided, check for schedule override first
    if (staffId && date) {
      const dateObj = new Date(date);
      
      // Check for override
      const override = await prisma.staffScheduleOverride.findUnique({
        where: {
          staffId_date: {
            staffId,
            date: dateObj,
          },
        },
      });
      
      if (override) {
        if (override.isDayOff) {
          // Day off - return empty/not working
          return NextResponse.json({
            isWorking: false,
            isDayOff: true,
            note: override.note,
          });
        } else {
          // Custom hours
          return NextResponse.json({
            isWorking: true,
            startTime: override.startTime,
            endTime: override.endTime,
            isCustom: true,
            note: override.note,
          });
        }
      }
    }
    
    // No override, get regular working hours
    const where: any = {};
    if (staffId) {
      where.staffId = staffId;
    }
    
    const workingHours = await prisma.workingHours.findMany({
      where,
      orderBy: [{ staffId: "asc" }, { dayOfWeek: "asc" }],
    });
    
    return NextResponse.json(workingHours);
  } catch (error) {
    console.error("Fetch working hours error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId, dayOfWeek, startTime, endTime, isWorking } = body;
    
    const workingHours = await prisma.workingHours.upsert({
      where: {
        staffId_dayOfWeek: { staffId, dayOfWeek },
      },
      update: { startTime, endTime, isWorking },
      create: { staffId, dayOfWeek, startTime, endTime, isWorking },
    });
    
    return NextResponse.json(workingHours);
  } catch (error) {
    console.error("Update working hours error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
