import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const { id } = await params;
  try {
    const body = await req.json();
    const category = await prisma.serviceCategory.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const { id } = await params;
  try {
    await prisma.service.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await prisma.serviceCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
