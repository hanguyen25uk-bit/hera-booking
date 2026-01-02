import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function getDefaultSalonId() {
  const salon = await prisma.salon.findFirst();
  return salon?.id;
}

export async function GET(req: NextRequest) {
  const salonId = await getDefaultSalonId();
  if (!salonId) return NextResponse.json([]);

  const staffId = req.nextUrl.searchParams.get("staffId");
  
  const where: any = { salonId };
  if (staffId) where.staffId = staffId;

  const workingHours = await prisma.workingHours.findMany({
    where,
    include: { staff: true },
    orderBy: [{ staffId: "asc" }, { dayOfWeek: "asc" }],
  });

  return NextResponse.json(workingHours);
}

export async function POST(req: NextRequest) {
  const salonId = await getDefaultSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();
  const { staffId, dayOfWeek, startTime, endTime, isWorking } = body;

  if (!staffId || dayOfWeek === undefined) {
    return NextResponse.json({ error: "staffId and dayOfWeek required" }, { status: 400 });
  }

  const workingHours = await prisma.workingHours.upsert({
    where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
    create: {
      salonId,
      staffId,
      dayOfWeek,
      startTime: startTime || "09:00",
      endTime: endTime || "17:00",
      isWorking: isWorking ?? true,
    },
    update: {
      startTime: startTime || "09:00",
      endTime: endTime || "17:00",
      isWorking: isWorking ?? true,
    },
  });

  return NextResponse.json(workingHours);
}
