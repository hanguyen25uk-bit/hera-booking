import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, price, sortOrder, isActive } = body;

    // Verify the extra belongs to this salon
    const existing = await prisma.extra.findFirst({
      where: { id, salonId: auth.salonId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Extra not found" }, { status: 404 });
    }

    const extra = await prisma.extra.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(extra);
  } catch (error) {
    console.error("Failed to update extra:", error);
    return NextResponse.json({ error: "Failed to update extra" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the extra belongs to this salon
    const existing = await prisma.extra.findFirst({
      where: { id, salonId: auth.salonId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Extra not found" }, { status: 404 });
    }

    await prisma.extra.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete extra:", error);
    return NextResponse.json({ error: "Failed to delete extra" }, { status: 500 });
  }
}
