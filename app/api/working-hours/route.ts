import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getDefaultSalonId() {
  // Fallback to victoria-nail-bar for dev
  return "victoria-nail-bar";//
  return salon?.id;
}

export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  const date = req.nextUrl.searchParams.get("date");
  
  try {
    // If date is provided, check for schedule override first
    if (staffId && date) {
      const dateObj = new Date(date);
      
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
          return NextResponse.json({
            isWorking: false,
            isDayOff: true,
            note: override.note,
          });
        } else {
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

// POST - single day update
export async function POST(req: NextRequest) {
  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    const body = await req.json();
    const { staffId, dayOfWeek, startTime, endTime, isWorking } = body;

    const workingHours = await prisma.workingHours.upsert({
      where: {
        staffId_dayOfWeek: { staffId, dayOfWeek },
      },
      update: { startTime, endTime, isWorking },
      create: { salonId, staffId, dayOfWeek, startTime, endTime, isWorking },
    });

    return NextResponse.json(workingHours);
  } catch (error) {
    console.error("Update working hours error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// PUT - bulk update all days for a staff (or all staff)
export async function PUT(req: NextRequest) {
  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon found" }, { status: 404 });
    }

    const body = await req.json();
    const { staffId, hours, applyToAll } = body;

    if (!hours || !Array.isArray(hours)) {
      return NextResponse.json({ error: "hours array required" }, { status: 400 });
    }

    // If applyToAll is true, apply to all active staff
    if (applyToAll) {
      const allStaff = await prisma.staff.findMany({
        where: { salonId, active: true },
        select: { id: true },
      });

      const results = await Promise.all(
        allStaff.flatMap((staff) =>
          hours.map(async (hour: any) => {
            return prisma.workingHours.upsert({
              where: {
                staffId_dayOfWeek: {
                  staffId: staff.id,
                  dayOfWeek: hour.dayOfWeek,
                },
              },
              update: {
                startTime: hour.startTime,
                endTime: hour.endTime,
                isWorking: hour.isWorking,
              },
              create: {
                salonId,
                staffId: staff.id,
                dayOfWeek: hour.dayOfWeek,
                startTime: hour.startTime,
                endTime: hour.endTime,
                isWorking: hour.isWorking,
              },
            });
          })
        )
      );

      return NextResponse.json({ updated: allStaff.length, results });
    }

    // Single staff update
    if (!staffId) {
      return NextResponse.json({ error: "staffId required" }, { status: 400 });
    }

    const results = await Promise.all(
      hours.map(async (hour: any) => {
        return prisma.workingHours.upsert({
          where: {
            staffId_dayOfWeek: {
              staffId,
              dayOfWeek: hour.dayOfWeek,
            },
          },
          update: {
            startTime: hour.startTime,
            endTime: hour.endTime,
            isWorking: hour.isWorking,
          },
          create: {
            salonId,
            staffId,
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime,
            endTime: hour.endTime,
            isWorking: hour.isWorking,
          },
        });
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Bulk update working hours error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
