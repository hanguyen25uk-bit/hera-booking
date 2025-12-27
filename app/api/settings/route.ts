import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: "default" },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { salonName, salonPhone, salonAddress, cancelMinutesAdvance } = body;

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: {
        salonName,
        salonPhone,
        salonAddress,
        cancelMinutesAdvance,
      },
      create: {
        id: "default",
        salonName,
        salonPhone,
        salonAddress,
        cancelMinutesAdvance,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
