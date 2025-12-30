import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const overrides = await prisma.staffScheduleOverride.findMany({
      include: { staff: true },
    });
    
    return NextResponse.json({
      count: overrides.length,
      overrides: overrides.map(o => ({
        id: o.id,
        staffId: o.staffId,
        staffName: o.staff.name,
        dateRaw: o.date,
        dateISO: o.date.toISOString(),
        isDayOff: o.isDayOff,
        startTime: o.startTime,
        endTime: o.endTime,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
