import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  const staffId = req.nextUrl.searchParams.get("staffId");

  try {
    const where = staffId ? { staffId } : {};
    const staffServices = await prisma.staffService.findMany({
      where,
      include: { staff: true, service: true },
    });
    return NextResponse.json(staffServices);
  } catch (error) {
    console.error("Fetch staff services error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { staffId, serviceId } = body;

    if (!staffId || !serviceId) {
      return NextResponse.json({ error: "Staff and service required" }, { status: 400 });
    }

    const staffService = await prisma.staffService.create({
      data: { staffId, serviceId },
      include: { staff: true, service: true },
    });

    return NextResponse.json(staffService);
  } catch (error) {
    console.error("Create staff service error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAdminAuth())) return unauthorizedResponse();

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.staffService.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete staff service error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
