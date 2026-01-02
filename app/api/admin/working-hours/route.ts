import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  const staffId = req.nextUrl.searchParams.get("staffId");

  try {
    const where = staffId ? { staffId } : {};
    const workingHours = await prisma.workingHours.findMany({
      where,
      include: { staff: true },
      orderBy: [{ staffId: "asc" }, { dayOfWeek: "asc" }],
    });
    return NextResponse.json(workingHours);
  } catch (error) {
    console.error("Fetch working hours error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { staffId, dayOfWeek, startTime, endTime, isWorking } = body;

    const workingHours = await prisma.workingHours.upsert({
      where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
      create: { staffId, dayOfWeek, startTime, endTime, isWorking: isWorking ?? true },
      update: { startTime, endTime, isWorking: isWorking ?? true },
    });

    return NextResponse.json(workingHours);
  } catch (error) {
    console.error("Save working hours error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
