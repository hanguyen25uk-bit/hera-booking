import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

// Helper to get the later time
function maxTime(a: string, b: string): string {
  const [aH, aM] = a.split(":").map(Number);
  const [bH, bM] = b.split(":").map(Number);
  return aH * 60 + aM >= bH * 60 + bM ? a : b;
}

// Helper to get the earlier time
function minTime(a: string, b: string): string {
  const [aH, aM] = a.split(":").map(Number);
  const [bH, bM] = b.split(":").map(Number);
  return aH * 60 + aM <= bH * 60 + bM ? a : b;
}

// Check if start time is before end time
function isValidRange(start: string, end: string): boolean {
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  return sH * 60 + sM < eH * 60 + eM;
}

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

    // Get shop hours for this day
    const shopHours = await prisma.salonWorkingHours.findFirst({
      where: { salonId: salon.id, dayOfWeek },
    });

    // If shop is closed, no availability
    if (shopHours && !shopHours.isOpen) {
      return NextResponse.json({
        available: false,
        reason: "Shop is closed",
      });
    }

    // Check for schedule overrides
    const overrides = await prisma.staffScheduleOverride.findMany({
      where: {
        staffId,
        date: dateObj,
        salonId: salon.id,
      },
    });

    // Check for full day off first
    const dayOffOverride = overrides.find(o => o.isDayOff);
    if (dayOffOverride) {
      return NextResponse.json({
        available: false,
        reason: "Day off",
        note: dayOffOverride.note,
      });
    }

    // Collect partial time-off ranges (isDayOff = false with times means staff is OFF during those hours)
    const excludeRanges: { startTime: string; endTime: string }[] = [];
    for (const override of overrides) {
      if (!override.isDayOff && override.startTime && override.endTime) {
        excludeRanges.push({
          startTime: override.startTime,
          endTime: override.endTime,
        });
      }
    }

    let staffStart: string;
    let staffEnd: string;

    // Get regular working hours
    const workingHours = await prisma.workingHours.findFirst({
      where: {
        staffId,
        dayOfWeek,
        salonId: salon.id,
      },
    });

    if (workingHours) {
      if (!workingHours.isWorking) {
        return NextResponse.json({
          available: false,
          reason: "Not working this day",
        });
      }
      staffStart = workingHours.startTime;
      staffEnd = workingHours.endTime;
    } else if (shopHours && shopHours.isOpen) {
      // Fall back to shop hours if no staff working hours configured
      staffStart = shopHours.startTime;
      staffEnd = shopHours.endTime;
    } else {
      // No working hours and no shop hours - not available
      return NextResponse.json({
        available: false,
        reason: "Schedule not configured",
      });
    }

    // Calculate effective hours (intersection of shop and staff hours)
    let effectiveStart = staffStart;
    let effectiveEnd = staffEnd;

    if (shopHours) {
      // Effective start is the later of shop open and staff start
      effectiveStart = maxTime(shopHours.startTime, staffStart);
      // Effective end is the earlier of shop close and staff end
      effectiveEnd = minTime(shopHours.endTime, staffEnd);
    }

    // Check if the range is valid
    if (!isValidRange(effectiveStart, effectiveEnd)) {
      return NextResponse.json({
        available: false,
        reason: "No available hours",
      });
    }

    return NextResponse.json({
      available: true,
      startTime: effectiveStart,
      endTime: effectiveEnd,
      excludeRanges: excludeRanges.length > 0 ? excludeRanges : undefined,
      shopHours: shopHours ? { start: shopHours.startTime, end: shopHours.endTime } : null,
    });
  } catch (error) {
    console.error("Fetch availability error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
