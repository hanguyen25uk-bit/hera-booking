import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getDefaultSalonId() {
  const salon = await prisma.salon.findFirst();
  return salon?.id;
}

// GET all staff
export async function GET() {
  const salonId = await getDefaultSalonId();
  if (!salonId) return NextResponse.json([]);

  const staff = await prisma.staff.findMany({
    where: { salonId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(staff);
}

// CREATE staff
export async function POST(req: Request) {
  const salonId = await getDefaultSalonId();
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
