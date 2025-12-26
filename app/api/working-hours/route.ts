import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId");

  try {
    if (staffId) {
      const workingHours = await prisma.workingHours.findMany({
        where: { staffId },
        orderBy: { dayOfWeek: "asc" },
      });
      return NextResponse.json(workingHours);
    }

    const workingHours = await prisma.workingHours.findMany({
      include: { staff: true },
      orderBy: [{ staffId: "asc" }, { dayOfWeek: "asc" }],
    });

    return NextResponse.json(workingHours);
  } catch (error) {
    console.error("Failed to fetch working hours:", error);
    return NextResponse.json({ error: "Failed to fetch working hours" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId, hours } = body;

    for (const hour of hours) {
      await prisma.workingHours.upsert({
        where: {
          staffId_dayOfWeek: { staffId, dayOfWeek: hour.dayOfWeek },
        },
        update: {
          startTime: hour.startTime,
          endTime: hour.endTime,
          isWorking: hour.isWorking,
        },
        create: {
          staffId,
          dayOfWeek: hour.dayOfWeek,
          startTime: hour.startTime,
          endTime: hour.endTime,
          isWorking: hour.isWorking,
        },
      });
    }

    const updated = await prisma.workingHours.findMany({
      where: { staffId },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update working hours:", error);
    return NextResponse.json({ error: "Failed to update working hours" }, { status: 500 });
  }
}
