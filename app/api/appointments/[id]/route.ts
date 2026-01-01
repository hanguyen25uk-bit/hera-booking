import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get single appointment
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true, staff: true, customer: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 });
  }
}

// PUT - Update appointment (reschedule, change service/staff, or update status)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await req.json();
    const { serviceId, staffId, startTime, status } = body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true, customer: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Handle status changes
    if (status) {
      // NO-SHOW: Increment customer's noShowCount
      if (status === "no-show" && appointment.status !== "no-show") {
        let customer = await prisma.customer.findUnique({
          where: { email: appointment.customerEmail },
        });

        if (customer) {
          const newNoShowCount = customer.noShowCount + 1;
          const shouldBlock = newNoShowCount >= 3;

          await prisma.customer.update({
            where: { email: appointment.customerEmail },
            data: {
              noShowCount: newNoShowCount,
              isBlocked: shouldBlock,
              blockedAt: shouldBlock ? new Date() : null,
            },
          });
        } else {
          await prisma.customer.create({
            data: {
              email: appointment.customerEmail,
              name: appointment.customerName,
              phone: appointment.customerPhone,
              noShowCount: 1,
              isBlocked: false,
            },
          });
        }

        const updated = await prisma.appointment.update({
          where: { id },
          data: { status: "no-show" },
          include: { service: true, staff: true },
        });

        const updatedCustomer = await prisma.customer.findUnique({
          where: { email: appointment.customerEmail },
        });

        return NextResponse.json({
          ...updated,
          customerNoShowCount: updatedCustomer?.noShowCount || 1,
          customerBlocked: updatedCustomer?.isBlocked || false,
        });
      }

      // CANCELLED: Just update status
      if (status === "cancelled") {
        const updated = await prisma.appointment.update({
          where: { id },
          data: { status: "cancelled" },
          include: { service: true, staff: true },
        });
        return NextResponse.json(updated);
      }

      // CONFIRMED: Restore to confirmed
      if (status === "confirmed") {
        const updated = await prisma.appointment.update({
          where: { id },
          data: { status: "confirmed" },
          include: { service: true, staff: true },
        });
        return NextResponse.json(updated);
      }
    }

    // Handle reschedule / edit
    const updateData: any = {};

    if (serviceId) {
      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }
      updateData.serviceId = serviceId;
      
      if (startTime) {
        const start = new Date(startTime);
        const end = new Date(start.getTime() + service.durationMinutes * 60000);
        updateData.startTime = start;
        updateData.endTime = end;
      } else {
        const end = new Date(appointment.startTime.getTime() + service.durationMinutes * 60000);
        updateData.endTime = end;
      }
    }

    if (staffId) {
      updateData.staffId = staffId;
    }

    if (startTime && !serviceId) {
      const start = new Date(startTime);
      const duration = appointment.service.durationMinutes;
      const end = new Date(start.getTime() + duration * 60000);
      updateData.startTime = start;
      updateData.endTime = end;
    }

    // Check for conflicts
    if (updateData.startTime || updateData.staffId) {
      const checkStaffId = updateData.staffId || appointment.staffId;
      const checkStart = updateData.startTime || appointment.startTime;
      const checkEnd = updateData.endTime || appointment.endTime;

      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          staffId: checkStaffId,
          status: { notIn: ["cancelled", "no-show"] },
          OR: [
            { startTime: { lt: checkEnd }, endTime: { gt: checkStart } },
          ],
        },
      });

      if (conflict) {
        return NextResponse.json({ error: "Time slot conflicts with another appointment" }, { status: 409 });
      }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { service: true, staff: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update appointment error:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}

// DELETE - Permanently delete appointment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    await prisma.appointment.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}
