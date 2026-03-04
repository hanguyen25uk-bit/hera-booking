import { prisma } from "@/lib/prisma";
import { sendAppointmentReminder } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";
import { addHours } from "date-fns";

// Vercel Cron job - runs daily at 8 AM UTC
// Finds appointments with reminders due today and sends them
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sets this header for cron jobs)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, verify the cron secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Find appointments where reminder is scheduled within the next 24 hours
    // This ensures we catch all reminders for tomorrow's appointments
    const windowStart = now;
    const windowEnd = addHours(now, 24);

    // Find appointments that need reminders
    const appointmentsToRemind = await prisma.appointment.findMany({
      where: {
        reminder24hSent: false,
        reminder24hScheduledFor: {
          gte: windowStart,
          lte: windowEnd,
        },
        status: "confirmed",
      },
      include: {
        service: true,
        staff: true,
        salon: true,
      },
    });

    console.log(`[Cron] Found ${appointmentsToRemind.length} appointments to remind`);

    const results = {
      total: appointmentsToRemind.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const appointment of appointmentsToRemind) {
      try {
        // Parse services if multiple
        let serviceNames: string[] | undefined;
        if (appointment.servicesJson) {
          const services = JSON.parse(appointment.servicesJson);
          serviceNames = services.map((s: { name: string }) => s.name);
        }

        // Send reminder email
        const emailResult = await sendAppointmentReminder({
          customerEmail: appointment.customerEmail,
          customerName: appointment.customerName,
          serviceName: appointment.service.name,
          serviceNames,
          staffName: appointment.staff.name,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          manageToken: appointment.manageToken,
          salonName: appointment.salon.name,
          salonAddress: appointment.salon.address || undefined,
          salonSlug: appointment.salon.slug,
        });

        if (emailResult.success) {
          // Mark reminder as sent
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { reminder24hSent: true },
          });
          results.sent++;
          console.log(`[Cron] Sent reminder for appointment ${appointment.id}`);
        } else {
          results.failed++;
          results.errors.push(`Failed to send email for ${appointment.id}`);
          console.error(`[Cron] Failed to send reminder for ${appointment.id}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error processing ${appointment.id}: ${error}`);
        console.error(`[Cron] Error processing appointment ${appointment.id}:`, error);
      }
    }

    console.log(`[Cron] Complete: ${results.sent} sent, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("[Cron] Error in reminder cron job:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
