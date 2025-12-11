import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all staff
export async function GET() {
  const staff = await prisma.staff.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(staff);
}

// CREATE staff
export async function POST(req: Request) {
  const body = await req.json();

  const newStaff = await prisma.staff.create({
    data: {
      name: body.name,
      role: body.role || null,
      active: body.active ?? true,
    },
  });

  return NextResponse.json(newStaff);
}
