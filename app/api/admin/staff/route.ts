import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

async function getDefaultSalonId() {
  const salon = await prisma.salon.findFirst();
  return salon?.id;
}

export async function GET() {
  const salonId = await getDefaultSalonId();
  if (!salonId) return NextResponse.json([]);

  const staff = await prisma.staff.findMany({
    where: { salonId },
    include: { staffServices: { include: { service: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  const salonId = await getDefaultSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

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

  return NextResponse.json(staff);
}
