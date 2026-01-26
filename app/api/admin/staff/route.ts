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
    include: { staffServices: { include: { service: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(staff);
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

  return NextResponse.json(staff);
}
