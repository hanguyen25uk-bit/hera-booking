import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, CreateExtraSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const extras = await prisma.extra.findMany({
      where: { salonId: auth.salonId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(extras);
  } catch (error) {
    console.error("Failed to fetch extras:", error);
    return NextResponse.json({ error: "Failed to fetch extras" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = validateBody(CreateExtraSchema, body);
    if (!validation.success) return validation.response;

    const { name, price, sortOrder = 0, isActive = true } = validation.data;

    const extra = await prisma.extra.create({
      data: {
        name,
        price,
        sortOrder,
        isActive,
        salonId: auth.salonId,
      },
    });

    return NextResponse.json(extra, { status: 201 });
  } catch (error) {
    console.error("Failed to create extra:", error);
    return NextResponse.json({ error: "Failed to create extra" }, { status: 500 });
  }
}
