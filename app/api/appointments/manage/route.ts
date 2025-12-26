import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { manageToken: token },
      include: { service: true, staff: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, token, status, startTime, staffId } = body;

    // Find appointment by id or token
    let appointment;
    if (id) {
      appointment = await prisma.appointment.findUnique({ where: { id } });
    } else if (token) {
      appointment = await prisma.appointment.findFirst({ where: { manageToken: token } });
    }

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Update appointment
    const updateData: any = {};
    if (status) updateData.status = status;
    if (startTime) {
      const newStart = new Date(startTime);
      const duration = (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime());
      updateData.startTime = newStart;
      updateData.endTime = new Date(newStart.getTime() + duration);
    }
    if (staffId) updateData.staffId = staffId;

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: updateData,
      include: { service: true, staff: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { manageToken: token },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    await prisma.appointment.delete({ where: { id: appointment.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}
