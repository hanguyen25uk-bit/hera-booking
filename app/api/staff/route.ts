import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  // Fallback to victoria-nail-bar for dev
  return "victoria-nail-bar";//
  return salon?.id || null;
}

// GET all staff
export async function GET() {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json([]);

  const staff = await prisma.staff.findMany({
    where: { salonId },
    orderBy: { createdAt: "desc" },
    include: {
      staffServices: {
        select: { serviceId: true },
      },
    },
  });

  // Transform to include serviceIds array
  const staffWithServices = staff.map(s => ({
    ...s,
    serviceIds: s.staffServices.map(ss => ss.serviceId),
  }));

  return NextResponse.json(staffWithServices);
}

// CREATE staff
export async function POST(req: Request) {
  const salonId = await getSalonId();
  if (!salonId) {
    return NextResponse.json({ error: "No salon found" }, { status: 404 });
  }

  const body = await req.json();

  const newStaff = await prisma.staff.create({
    data: {
      salonId,
      name: body.name,
      role: body.role || null,
      active: body.active ?? true,
    },
  });

  return NextResponse.json(newStaff);
}
