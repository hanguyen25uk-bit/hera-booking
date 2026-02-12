import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";

export async function GET() {
  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const staff = await prisma.staff.findMany({
    where: { salonId: auth.salonId },
    include: { staffServices: { select: { serviceId: true } } },
    orderBy: { name: "asc" },
  });

  // Transform to include serviceIds array
  const staffWithServices = staff.map(s => ({
    ...s,
    serviceIds: s.staffServices.map(ss => ss.serviceId),
  }));

  return NextResponse.json(staffWithServices);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const body = await req.json();
  const { name, role } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const staff = await prisma.staff.create({
    data: {
      salonId: auth.salonId,
      name,
      role: role || null,
    },
  });

  // Get salon working hours to use as default for new staff
  const salonHours = await prisma.salonWorkingHours.findMany({
    where: { salonId: auth.salonId },
  });

  // Create working hours based on salon hours (or use defaults if salon hours not set)
  const workingHoursData = [];

  if (salonHours.length > 0) {
    // Use salon hours
    for (const sh of salonHours) {
      workingHoursData.push({
        salonId: auth.salonId,
        staffId: staff.id,
        dayOfWeek: sh.dayOfWeek,
        startTime: sh.startTime,
        endTime: sh.endTime,
        isWorking: sh.isOpen,
      });
    }
  } else {
    // Fallback to default hours if salon hours not configured
    for (let day = 0; day <= 6; day++) {
      workingHoursData.push({
        salonId: auth.salonId,
        staffId: staff.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "18:00",
        isWorking: day !== 0, // Sunday off by default
      });
    }
  }

  await prisma.workingHours.createMany({ data: workingHoursData });

  return NextResponse.json(staff);
}
