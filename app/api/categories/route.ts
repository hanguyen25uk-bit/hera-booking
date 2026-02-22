import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  return "heranailspa";
}

export async function GET(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json([]);

  const categories = await prisma.serviceCategory.findMany({
    where: { salonId },
    include: { services: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();
  const { name, description, sortOrder } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const category = await prisma.serviceCategory.create({
    data: {
      salonId,
      name,
      description: description || null,
      sortOrder: sortOrder || 0,
    },
  });

  return NextResponse.json(category);
}

export async function PUT(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();
  const { id, name, description, sortOrder } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const category = await prisma.serviceCategory.update({
    where: { id },
    data: {
      name,
      description: description || null,
      sortOrder: sortOrder || 0,
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.serviceCategory.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
