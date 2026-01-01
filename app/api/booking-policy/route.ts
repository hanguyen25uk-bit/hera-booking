import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_POLICIES = [
  {
    icon: "💵",
    title: "We accept CASH only.",
    description: "By booking an appointment, you confirm that you agree to pay in cash on the day of your service."
  },
  {
    icon: "🚫",
    title: "No Deposit Required",
    description: "We do not take a deposit for this booking. During peak hours, we always prioritise booking customers first, but if you can't wait and have plans afterwards, please do not book and leave the slot for someone who needs it."
  },
  {
    icon: "⏰",
    title: "Cancellation Policy",
    description: "Please cancel at least 2 hours before your appointment. No-shows may result in booking restrictions."
  },
  {
    icon: "📍",
    title: "Arrival Time",
    description: "Please arrive 5 minutes before your appointment time."
  }
];

// GET - Public endpoint to get booking policy
export async function GET() {
  try {
    let policy = await prisma.bookingPolicy.findUnique({
      where: { id: "default" },
    });

    if (!policy) {
      // Create default policy
      policy = await prisma.bookingPolicy.create({
        data: {
          id: "default",
          title: "Our Booking Policy",
          policies: JSON.stringify(DEFAULT_POLICIES),
        },
      });
    }

    return NextResponse.json({
      title: policy.title,
      policies: JSON.parse(policy.policies),
    });
  } catch (error) {
    console.error("Get booking policy error:", error);
    return NextResponse.json({ error: "Failed to get policy" }, { status: 500 });
  }
}

// PUT - Admin endpoint to update booking policy
export async function PUT(req: NextRequest) {
  try {
    const { title, policies } = await req.json();

    if (!title || !policies || !Array.isArray(policies)) {
      return NextResponse.json({ error: "Title and policies array required" }, { status: 400 });
    }

    const policy = await prisma.bookingPolicy.upsert({
      where: { id: "default" },
      update: {
        title,
        policies: JSON.stringify(policies),
        updatedAt: new Date(),
      },
      create: {
        id: "default",
        title,
        policies: JSON.stringify(policies),
      },
    });

    return NextResponse.json({
      title: policy.title,
      policies: JSON.parse(policy.policies),
    });
  } catch (error) {
    console.error("Update booking policy error:", error);
    return NextResponse.json({ error: "Failed to update policy" }, { status: 500 });
  }
}
