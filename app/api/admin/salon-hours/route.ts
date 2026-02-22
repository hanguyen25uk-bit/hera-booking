import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, unauthorizedResponse } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, SalonHoursSchema, BulkSalonHoursSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const hours = await prisma.salonWorkingHours.findMany({
    where: { salonId: auth.salonId },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json(hours);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const body = await req.json();
  const validation = validateBody(SalonHoursSchema, body);
  if (!validation.success) return validation.response;

  const { dayOfWeek, startTime, endTime, isOpen } = validation.data;

  const hours = await prisma.salonWorkingHours.upsert({
    where: { salonId_dayOfWeek: { salonId: auth.salonId, dayOfWeek } },
    create: {
      salonId: auth.salonId,
      dayOfWeek,
      startTime: startTime || "09:00",
      endTime: endTime || "18:00",
      isOpen: isOpen ?? true,
    },
    update: {
      startTime: startTime || "09:00",
      endTime: endTime || "18:00",
      isOpen: isOpen ?? true,
    },
  });

  // Also update all staff working hours for this day
  await syncStaffHoursForDay(auth.salonId, dayOfWeek, startTime || "09:00", endTime || "18:00", isOpen ?? true);

  return NextResponse.json(hours);
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  const auth = await getAuthPayload();
  if (!auth?.salonId) return unauthorizedResponse();

  const body = await req.json();
  const validation = validateBody(BulkSalonHoursSchema, body);
  if (!validation.success) return validation.response;

  const { hours } = validation.data;

  // Update all salon hours in a transaction
  const results = await prisma.$transaction(
    hours.map((h: { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean }) =>
      prisma.salonWorkingHours.upsert({
        where: { salonId_dayOfWeek: { salonId: auth.salonId, dayOfWeek: h.dayOfWeek } },
        create: {
          salonId: auth.salonId,
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime || "09:00",
          endTime: h.endTime || "18:00",
          isOpen: h.isOpen ?? true,
        },
        update: {
          startTime: h.startTime || "09:00",
          endTime: h.endTime || "18:00",
          isOpen: h.isOpen ?? true,
        },
      })
    )
  );

  // Sync ALL staff working hours to match new salon hours
  await syncAllStaffHours(auth.salonId, hours);

  return NextResponse.json(results);
});

// Helper: Sync staff hours for a single day
async function syncStaffHoursForDay(
  salonId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  isOpen: boolean
) {
  // Get all staff for this salon
  const staff = await prisma.staff.findMany({
    where: { salonId },
    select: { id: true },
  });

  if (staff.length === 0) return;

  // Update each staff member's hours for this day
  await Promise.all(
    staff.map((s) =>
      prisma.workingHours.upsert({
        where: { staffId_dayOfWeek: { staffId: s.id, dayOfWeek } },
        create: {
          salonId,
          staffId: s.id,
          dayOfWeek,
          startTime,
          endTime,
          isWorking: isOpen,
        },
        update: {
          startTime,
          endTime,
          isWorking: isOpen,
        },
      })
    )
  );
}

// Helper: Sync all staff hours to match salon hours
async function syncAllStaffHours(
  salonId: string,
  salonHours: { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean }[]
) {
  // Get all staff for this salon
  const staff = await prisma.staff.findMany({
    where: { salonId },
    select: { id: true },
  });

  if (staff.length === 0) return;

  // For each staff member, update all their working hours
  const updates: Promise<unknown>[] = [];

  for (const s of staff) {
    for (const h of salonHours) {
      updates.push(
        prisma.workingHours.upsert({
          where: { staffId_dayOfWeek: { staffId: s.id, dayOfWeek: h.dayOfWeek } },
          create: {
            salonId,
            staffId: s.id,
            dayOfWeek: h.dayOfWeek,
            startTime: h.startTime || "09:00",
            endTime: h.endTime || "18:00",
            isWorking: h.isOpen ?? true,
          },
          update: {
            startTime: h.startTime || "09:00",
            endTime: h.endTime || "18:00",
            isWorking: h.isOpen ?? true,
          },
        })
      );
    }
  }

  await Promise.all(updates);
}
