import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendRescheduleConfirmation, sendCancellationConfirmation } from "@/lib/email";

const prisma = new PrismaClient();

// UPDATE appointment (reschedule)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { token, startTime } = body;

    if (!token || !startTime) {
      return NextResponse.json(
        { error: "Token and startTime required" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findFirst({
      where: { manageToken: token },
      include: { service: true, staff: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (appointment.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot reschedule cancelled booking" },
        { status: 400 }
      );
    }

    const oldTime = appointment.startTime;
    const newStart = new Date(startTime);
    const newEnd = new Date(
      newStart.getTime() + appointment.service.durationMinutes * 60000
    );

    const now = new Date();
    const hoursUntilAppointment =
      (newStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 24) {
      return NextResponse.json(
        { error: "Cannot reschedule within 24 hours of appointment" },
        { status: 400 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        startTime: newStart,
        endTime: newEnd,
      },
      include: {
        service: true,
        staff: true,
      },
    });

    // Send reschedule confirmation email
    try {
      await sendRescheduleConfirmation({
        customerEmail: updated.customerEmail,
        customerName: updated.customerName,
        serviceName: updated.service.name,
        staffName: updated.staff.name,
        oldTime: oldTime,
        newTime: newStart,
        manageToken: updated.manageToken || "",
      });
      console.log("✅ Reschedule email sent");
    } catch (emailError) {
      console.error("⚠️ Failed to send reschedule email:", emailError);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}

// CANCEL appointment
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { manageToken: token },
      include: { service: true, staff: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (appointment.status === "cancelled") {
      return NextResponse.json(
        { error: "Booking already cancelled" },
        { status: 400 }
      );
    }

    const now = new Date();
    const hoursUntilAppointment =
      (appointment.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 24) {
      return NextResponse.json(
        { error: "Cannot cancel within 24 hours. Please call us." },
        { status: 400 }
      );
    }

    const cancelled = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "cancelled" },
      include: {
        service: true,
        staff: true,
      },
    });

    // Send cancellation confirmation email
    try {
      await sendCancellationConfirmation({
        customerEmail: cancelled.customerEmail,
        customerName: cancelled.customerName,
        serviceName: cancelled.service.name,
        staffName: cancelled.staff.name,
        appointmentTime: cancelled.startTime,
      });
      console.log("✅ Cancellation email sent");
    } catch (emailError) {
      console.error("⚠️ Failed to send cancellation email:", emailError);
    }

    return NextResponse.json(cancelled);
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to cancel appointment" },
      { status: 500 }
    );
  }
}