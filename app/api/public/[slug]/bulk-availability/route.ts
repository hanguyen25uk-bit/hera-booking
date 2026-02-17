import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

type StaffAvailability = {
  available: boolean;
  reason?: string;
  startTime?: string;
  endTime?: string;
  excludeRanges?: { startTime: string; endTime: string }[];
  note?: string;
};

type ReservedSlot = {
  startTime: string;
  endTime: string;
};

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
  const staffIds = req.nextUrl.searchParams.get("staffIds"); // comma-separated
  const date = req.nextUrl.searchParams.get("date");
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  if (!staffIds || !date) {
    return NextResponse.json({ error: "staffIds and date required" }, { status: 400 });
  }

  try {
    const staffIdList = staffIds.split(",").filter(Boolean);
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    // Get shop hours for this day (single query)
    const shopHours = await prisma.salonWorkingHours.findFirst({
      where: { salonId: salon.id, dayOfWeek },
    });

    // If shop is closed, no one is available
    if (shopHours && !shopHours.isOpen) {
      const result: Record<string, StaffAvailability> = {};
      for (const staffId of staffIdList) {
        result[staffId] = { available: false, reason: "Shop is closed" };
      }
      return NextResponse.json({
        availability: result,
        bookedSlots: {},
        reservedSlots: {},
      });
    }

    // Batch queries for all staff data
    const [allOverrides, allWorkingHours, allReservations, allAppointments] = await Promise.all([
      // All schedule overrides for all staff on this date
      prisma.staffScheduleOverride.findMany({
        where: {
          staffId: { in: staffIdList },
          date: dateObj,
          salonId: salon.id,
        },
      }),
      // All working hours for all staff on this day of week
      prisma.workingHours.findMany({
        where: {
          staffId: { in: staffIdList },
          dayOfWeek,
          salonId: salon.id,
        },
      }),
      // All slot reservations for all staff on this date
      prisma.slotReservation.findMany({
        where: {
          salonId: salon.id,
          staffId: { in: staffIdList },
          startTime: {
            gte: new Date(date + "T00:00:00"),
            lte: new Date(date + "T23:59:59"),
          },
          expiresAt: { gt: new Date() }, // Only active reservations
          sessionId: sessionId ? { not: sessionId } : undefined, // Exclude current session
        },
      }),
      // All appointments for all staff on this date
      prisma.appointment.findMany({
        where: {
          salonId: salon.id,
          staffId: { in: staffIdList },
          startTime: {
            gte: new Date(date + "T00:00:00"),
            lte: new Date(date + "T23:59:59"),
          },
          status: { notIn: ["cancelled", "no-show"] },
        },
      }),
    ]);

    // Clean expired reservations in background (non-blocking)
    prisma.slotReservation.deleteMany({
      where: { expiresAt: { lt: new Date() }, salonId: salon.id },
    }).catch(() => {});

    // Group data by staffId for efficient lookup
    const overridesByStaff = new Map<string, typeof allOverrides>();
    for (const override of allOverrides) {
      if (!overridesByStaff.has(override.staffId)) {
        overridesByStaff.set(override.staffId, []);
      }
      overridesByStaff.get(override.staffId)!.push(override);
    }

    const workingHoursByStaff = new Map<string, typeof allWorkingHours[0]>();
    for (const wh of allWorkingHours) {
      workingHoursByStaff.set(wh.staffId, wh);
    }

    // Build results
    const availability: Record<string, StaffAvailability> = {};
    const bookedSlots: Record<string, ReservedSlot[]> = {};
    const reservedSlots: Record<string, ReservedSlot[]> = {};

    for (const staffId of staffIdList) {
      const overrides = overridesByStaff.get(staffId) || [];
      const workingHours = workingHoursByStaff.get(staffId);

      // Check for full day off first
      const dayOffOverride = overrides.find(o => o.isDayOff);
      if (dayOffOverride) {
        availability[staffId] = {
          available: false,
          reason: "Day off",
          note: dayOffOverride.note || undefined,
        };
        continue;
      }

      // Collect partial time-off ranges
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

      if (workingHours) {
        if (!workingHours.isWorking) {
          availability[staffId] = {
            available: false,
            reason: "Not working this day",
          };
          continue;
        }
        staffStart = workingHours.startTime;
        staffEnd = workingHours.endTime;
      } else if (shopHours && shopHours.isOpen) {
        // Fall back to shop hours
        staffStart = shopHours.startTime;
        staffEnd = shopHours.endTime;
      } else {
        availability[staffId] = {
          available: false,
          reason: "Schedule not configured",
        };
        continue;
      }

      // Calculate effective hours (intersection of shop and staff hours)
      let effectiveStart = staffStart;
      let effectiveEnd = staffEnd;

      if (shopHours) {
        effectiveStart = maxTime(shopHours.startTime, staffStart);
        effectiveEnd = minTime(shopHours.endTime, staffEnd);
      }

      // Check if the range is valid
      if (!isValidRange(effectiveStart, effectiveEnd)) {
        availability[staffId] = {
          available: false,
          reason: "No available hours",
        };
        continue;
      }

      availability[staffId] = {
        available: true,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        excludeRanges: excludeRanges.length > 0 ? excludeRanges : undefined,
      };
    }

    // Group reservations and appointments by staff
    for (const res of allReservations) {
      if (!reservedSlots[res.staffId]) {
        reservedSlots[res.staffId] = [];
      }
      reservedSlots[res.staffId].push({
        startTime: res.startTime.toISOString(),
        endTime: res.endTime.toISOString(),
      });
    }

    for (const apt of allAppointments) {
      if (!bookedSlots[apt.staffId]) {
        bookedSlots[apt.staffId] = [];
      }
      bookedSlots[apt.staffId].push({
        startTime: apt.startTime.toISOString(),
        endTime: apt.endTime.toISOString(),
      });
    }

    return NextResponse.json({
      availability,
      bookedSlots,
      reservedSlots,
    });
  } catch (error) {
    console.error("Bulk availability error:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
