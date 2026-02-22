import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  try {
    const body = await req.json();
    const staff = await prisma.staff.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Update staff error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  try {
    await prisma.staff.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete staff error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
