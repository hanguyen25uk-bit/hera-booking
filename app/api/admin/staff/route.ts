import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

export async function GET() {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  try {
    const staff = await prisma.staff.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Fetch staff error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { name, role } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const staff = await prisma.staff.create({
      data: { name, role: role || null },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
