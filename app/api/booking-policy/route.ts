import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/admin-auth";

async function getSalonId(): Promise<string | null> {
  const auth = await getAuthPayload();
  if (auth?.salonId) return auth.salonId;
  // Fallback to heranailspa for dev
  return "heranailspa";
  return salon?.id || null;
}

export async function GET() {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ title: "Booking Policy", policies: [] });

  const policy = await prisma.bookingPolicy.findUnique({
    where: { salonId },
  });

  if (!policy) {
    return NextResponse.json({ title: "Booking Policy", policies: [] });
  }

  return NextResponse.json({
    title: policy.title,
    policies: JSON.parse(policy.policies),
  });
}

export async function POST(req: NextRequest) {
  const salonId = await getSalonId();
  if (!salonId) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();
  const { title, policies } = body;

  const policy = await prisma.bookingPolicy.upsert({
    where: { salonId },
    create: {
      salonId,
      title: title || "Booking Policy",
      policies: JSON.stringify(policies || []),
    },
    update: {
      title: title || "Booking Policy",
      policies: JSON.stringify(policies || []),
    },
  });

  return NextResponse.json({
    title: policy.title,
    policies: JSON.parse(policy.policies),
  });
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
