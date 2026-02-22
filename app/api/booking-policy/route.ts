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
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

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
