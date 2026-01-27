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

    // Check for schedule override
    const override = await prisma.staffScheduleOverride.findFirst({
      where: {
        staffId,
        date: dateObj,
        salonId: salon.id,
      },
    });

    let staffStart: string;
    let staffEnd: string;

    if (override) {
      if (override.isDayOff) {
        return NextResponse.json({
          available: false,
          reason: "Day off",
          note: override.note,
        });
      }
      staffStart = override.startTime || "09:00";
      staffEnd = override.endTime || "18:00";
    } else {
      // Get regular working hours
      const workingHours = await prisma.workingHours.findFirst({
        where: {
          staffId,
          dayOfWeek,
          salonId: salon.id,
        },
      });

      if (!workingHours || !workingHours.isWorking) {
        return NextResponse.json({
          available: false,
          reason: "Not working this day",
        });
      }
      staffStart = workingHours.startTime;
      staffEnd = workingHours.endTime;
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
      shopHours: shopHours ? { start: shopHours.startTime, end: shopHours.endTime } : null,
    });
  } catch (error) {
    console.error("Fetch availability error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
