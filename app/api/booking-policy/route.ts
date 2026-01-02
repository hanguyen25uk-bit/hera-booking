import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function getDefaultSalonId() {
  const salon = await prisma.salon.findFirst();
  return salon?.id;
}

export async function GET() {
  const salonId = await getDefaultSalonId();
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
  const salonId = await getDefaultSalonId();
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
