import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendCancellationConfirmation } from "@/lib/email";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, token, status, startTime } = body;

    let appointment;
    if (token) {
      appointment = await prisma.appointment.findFirst({
        where: { manageToken: token },
        include: { service: true, staff: true },
      });
    } else if (id) {
      appointment = await prisma.appointment.findUnique({
        where: { id },
        include: { service: true, staff: true },
      });
    }

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
      
      if (status === "noshow" && appointment.customerEmail) {
        const customer = await prisma.customer.findUnique({
          where: { email: appointment.customerEmail.toLowerCase() },
        });

        if (customer) {
          const newNoShowCount = customer.noShowCount + 1;
          await prisma.customer.update({
            where: { email: appointment.customerEmail.toLowerCase() },
            data: {
              noShowCount: newNoShowCount,
              isBlocked: newNoShowCount >= 3,
              blockedAt: newNoShowCount >= 3 ? new Date() : null,
            },
          });
          console.log(`Customer ${appointment.customerEmail} no-show count: ${newNoShowCount}`);
        }
      }
    }

    if (startTime) {
      const newStart = new Date(startTime);
      const duration = appointment.service.durationMinutes;
      const newEnd = new Date(newStart.getTime() + duration * 60000);
      updateData.startTime = newStart;
      updateData.endTime = newEnd;
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: updateData,
      include: { service: true, staff: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update appointment error:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { manageToken: token },
      include: { service: true, staff: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "cancelled" },
      include: { service: true, staff: true },
    });

    // Send cancellation email
    try {
      const startDate = new Date(appointment.startTime);
      await sendCancellationConfirmation({
        customerEmail: appointment.customerEmail,
        customerName: appointment.customerName,
        serviceName: appointment.service.name,
        staffName: appointment.staff.name,
        appointmentDate: startDate.toISOString().split("T")[0],
        appointmentTime: startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        bookingRef: appointment.id.slice(0, 8).toUpperCase(),
      });
      console.log("Cancellation email sent to:", appointment.customerEmail);
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Cancel appointment error:", error);
    return NextResponse.json({ error: "Failed to cancel appointment" }, { status: 500 });
  }
}
