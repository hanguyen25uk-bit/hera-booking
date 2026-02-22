import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendCancellationConfirmation } from "@/lib/email";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, ManageAppointmentSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "api");
  if (!rateLimit.success) return rateLimit.response;

  const body = await req.json();
  const validation = validateBody(ManageAppointmentSchema, body);
  if (!validation.success) return validation.response;

  const { id, token, status, startTime } = validation.data;

  let appointment;
  if (token) {
    appointment = await prisma.appointment.findFirst({
      where: { manageToken: token },
      include: { service: true, staff: true, salon: true },
    });
  } else if (id) {
    appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true, staff: true, salon: true },
    });
  }

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const updateData: any = {};

  if (status) {
    updateData.status = status;

    // Handle no-show: update customer record
    if (status === "noshow" && appointment.customerEmail) {
      const customer = await prisma.customer.findUnique({
        where: {
          salonId_email: {
            salonId: appointment.salonId,
            email: appointment.customerEmail.toLowerCase()
          }
        },
      });

      if (customer) {
        const newNoShowCount = customer.noShowCount + 1;
        await prisma.customer.update({
          where: {
            salonId_email: {
              salonId: appointment.salonId,
              email: appointment.customerEmail.toLowerCase()
            }
          },
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
});

export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "api");
  if (!rateLimit.success) return rateLimit.response;

  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findFirst({
    where: { manageToken: token },
    include: { service: true, staff: true, salon: true },
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
    await sendCancellationConfirmation({
      customerEmail: appointment.customerEmail,
      customerName: appointment.customerName,
      serviceName: appointment.service.name,
      staffName: appointment.staff.name,
      startTime: new Date(appointment.startTime),
      salonName: appointment.salon.name,
    });
    console.log("Cancellation email sent to:", appointment.customerEmail);
  } catch (emailError) {
    console.error("Failed to send cancellation email:", emailError);
  }

  return NextResponse.json(updated);
});
