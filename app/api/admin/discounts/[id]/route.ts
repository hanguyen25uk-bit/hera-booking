import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify discount belongs to this salon
    const existing = await prisma.discount.findFirst({
      where: { id, salonId: auth.salonId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, discountPercent, startTime, endTime, daysOfWeek, serviceIds, staffIds, isActive, validFrom, validUntil } = body;

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(discountPercent !== undefined && { discountPercent: parseInt(discountPercent) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(daysOfWeek !== undefined && { daysOfWeek }),
        ...(serviceIds !== undefined && { serviceIds }),
        ...(staffIds !== undefined && { staffIds }),
        ...(isActive !== undefined && { isActive }),
        ...(validFrom !== undefined && { validFrom: validFrom ? new Date(validFrom) : null }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
      },
    });

    return NextResponse.json(discount);
  } catch (error) {
    console.error("Update discount error:", error);
    return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify discount belongs to this salon
    const existing = await prisma.discount.findFirst({
      where: { id, salonId: auth.salonId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    await prisma.discount.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete discount error:", error);
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
  }
}
