import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  // Fallback to victoria-nail-bar for dev
  return "victoria-nail-bar";//
  return salon?.id || null;
}

export async function GET() {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json([]);

  const hours = await prisma.salonWorkingHours.findMany({
    where: { salonId },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json(hours);
}

export async function POST(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return unauthorizedResponse();

  const body = await req.json();
  const { dayOfWeek, startTime, endTime, isOpen } = body;

  if (dayOfWeek === undefined) {
    return NextResponse.json({ error: "dayOfWeek required" }, { status: 400 });
  }

  const hours = await prisma.salonWorkingHours.upsert({
    where: { salonId_dayOfWeek: { salonId, dayOfWeek } },
    create: {
      salonId,
      dayOfWeek,
      startTime: startTime || "09:00",
      endTime: endTime || "18:00",
      isOpen: isOpen ?? true,
    },
    update: {
      startTime: startTime || "09:00",
      endTime: endTime || "18:00",
      isOpen: isOpen ?? true,
    },
  });

  return NextResponse.json(hours);
}

export async function PUT(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return unauthorizedResponse();

  const body = await req.json();
  const { hours } = body; // Array of { dayOfWeek, startTime, endTime, isOpen }

  if (!Array.isArray(hours)) {
    return NextResponse.json({ error: "hours array required" }, { status: 400 });
  }

  // Update all hours in a transaction
  const results = await prisma.$transaction(
    hours.map((h: { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean }) =>
      prisma.salonWorkingHours.upsert({
        where: { salonId_dayOfWeek: { salonId, dayOfWeek: h.dayOfWeek } },
        create: {
          salonId,
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime || "09:00",
          endTime: h.endTime || "18:00",
          isOpen: h.isOpen ?? true,
        },
        update: {
          startTime: h.startTime || "09:00",
          endTime: h.endTime || "18:00",
          isOpen: h.isOpen ?? true,
        },
      })
    )
  );

  return NextResponse.json(results);
}
