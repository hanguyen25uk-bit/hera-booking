import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  const salon = await prisma.salon.findFirst();
  return salon?.id || null;
}

export async function GET() {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json([]);

  const staff = await prisma.staff.findMany({
    where: { salonId },
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
  const salonId = await getSalonId();
  if (!salonId) return unauthorizedResponse();

  const body = await req.json();
  const { name, role } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const staff = await prisma.staff.create({
    data: {
      salonId,
      name,
      role: role || null,
    },
  });

  // Create default working hours (Monday-Saturday, 09:00-18:00)
  const defaultWorkingHours = [];
  for (let day = 1; day <= 6; day++) { // 1=Monday to 6=Saturday
    defaultWorkingHours.push({
      salonId,
      staffId: staff.id,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "18:00",
      isWorking: true,
    });
  }
  // Sunday off
  defaultWorkingHours.push({
    salonId,
    staffId: staff.id,
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "18:00",
    isWorking: false,
  });

  await prisma.workingHours.createMany({ data: defaultWorkingHours });

  return NextResponse.json(staff);
}
