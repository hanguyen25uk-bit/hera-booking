import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  return "heranailspa";
}

export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");
  const date = req.nextUrl.searchParams.get("date");

  if (!staffId || !date) {
    return NextResponse.json({ error: "staffId and date required" }, { status: 400 });
  }

  try {
    const salonId = await getSalonId();
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

    // 1. Check for schedule override (admin can set specific date changes)
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
          reason: "Day off",
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

    // 2. Check staff's regular working hours (admin-configured)
    const workingHours = await prisma.workingHours.findUnique({
      where: {
        staffId_dayOfWeek: {
          staffId,
          dayOfWeek,
        },
      },
    });

    // 3. Get shop hours as fallback
    const shopHours = await prisma.salonWorkingHours.findUnique({
      where: {
        salonId_dayOfWeek: {
          salonId,
          dayOfWeek,
        },
      },
    });

    // If staff working hours are configured, use them
    if (workingHours) {
      if (!workingHours.isWorking) {
        return NextResponse.json({
          available: false,
          reason: "Not working this day",
        });
      }

      return NextResponse.json({
        available: true,
        startTime: workingHours.startTime,
        endTime: workingHours.endTime,
        shopHours: shopHours ? { start: shopHours.startTime, end: shopHours.endTime } : null,
      });
    }

    // 4. No staff working hours configured - fall back to shop hours
    if (shopHours) {
      if (!shopHours.isOpen) {
        return NextResponse.json({
          available: false,
          reason: "Shop closed",
        });
      }

      return NextResponse.json({
        available: true,
        startTime: shopHours.startTime,
        endTime: shopHours.endTime,
        isShopHours: true,
        shopHours: { start: shopHours.startTime, end: shopHours.endTime },
      });
    }

    // 5. No configuration at all - staff unavailable (admin needs to configure)
    return NextResponse.json({
      available: false,
      reason: "Schedule not configured",
      needsSetup: true,
    });
  } catch (error) {
    console.error("Check availability error:", error);
    return NextResponse.json({ error: "Failed to check" }, { status: 500 });
  }
}
