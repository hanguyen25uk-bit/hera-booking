import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  return "heranailspa";
}

// GET all staff
export async function GET(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json([]);

  // Check if we should filter by active status
  const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";

  const staff = await prisma.staff.findMany({
    where: {
      salonId,
      ...(activeOnly && { active: true }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      staffServices: {
        select: { serviceId: true },
      },
    },
  });

  // Transform to include serviceIds array
  const staffWithServices = staff.map(s => ({
    ...s,
    serviceIds: s.staffServices.map(ss => ss.serviceId),
  }));

  return NextResponse.json(staffWithServices);
}

// CREATE staff
export async function POST(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const salonId = await getSalonId();
  if (!salonId) {
    return NextResponse.json({ error: "No salon found" }, { status: 404 });
  }

  const body = await req.json();

  const newStaff = await prisma.staff.create({
    data: {
      salonId,
      name: body.name,
      role: body.role || null,
      active: body.active ?? true,
    },
  });

  return NextResponse.json(newStaff);
}
