import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";

export async function PUT(req: NextRequest) {
  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { serviceIds } = body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json({ error: "serviceIds array required" }, { status: 400 });
    }

    // Update sortOrder for each service
    await prisma.$transaction(
      serviceIds.map((id: string, index: number) =>
        prisma.service.update({
          where: { id, salonId: auth.salonId },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder services error:", error);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}
