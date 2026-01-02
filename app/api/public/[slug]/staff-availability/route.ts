import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const staffId = req.nextUrl.searchParams.get("staffId");
  const date = req.nextUrl.searchParams.get("date");
  
  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  if (!staffId || !date) {
    return NextResponse.json({ error: "staffId and date required" }, { status: 400 });
  }

  try {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    // Check for schedule override
    const override = await prisma.staffScheduleOverride.findUnique({
      where: {
        staffId_date: { staffId, date: dateObj },
        salonId: salon.id,
      },
    });

    if (override) {
      if (override.isDayOff) {
        return NextResponse.json({
          available: false,
          reason: "Day off",
          note: override.note,
        });
      }
      return NextResponse.json({
        available: true,
        startTime: override.startTime,
        endTime: override.endTime,
        isCustom: true,
        note: override.note,
      });
    }

    // Get regular working hours
    const workingHours = await prisma.workingHours.findUnique({
      where: {
        staffId_dayOfWeek: { staffId, dayOfWeek },
        salonId: salon.id,
      },
    });

    if (!workingHours || !workingHours.isWorking) {
      return NextResponse.json({
        available: false,
        reason: "Not working this day",
      });
    }

    return NextResponse.json({
      available: true,
      startTime: workingHours.startTime,
      endTime: workingHours.endTime,
    });
  } catch (error) {
    console.error("Fetch availability error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
