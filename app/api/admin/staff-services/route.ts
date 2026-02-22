import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

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
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { staffId, serviceId, serviceIds } = body;

    if (!staffId) {
      return NextResponse.json({ error: "Staff ID required" }, { status: 400 });
    }

    // Handle bulk assignment (serviceIds array)
    if (serviceIds && Array.isArray(serviceIds)) {
      // Delete existing staff services for this staff
      await prisma.staffService.deleteMany({ where: { staffId } });

      // Create new staff services
      if (serviceIds.length > 0) {
        await prisma.staffService.createMany({
          data: serviceIds.map((svcId: string) => ({ staffId, serviceId: svcId })),
        });
      }

      const staffServices = await prisma.staffService.findMany({
        where: { staffId },
        include: { staff: true, service: true },
      });
      return NextResponse.json(staffServices);
    }

    // Handle single service assignment
    if (!serviceId) {
      return NextResponse.json({ error: "Service ID required" }, { status: 400 });
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
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

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
