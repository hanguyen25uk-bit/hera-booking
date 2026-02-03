import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const salonId = "victoria-nail-bar";

  // Get all staff and services for this salon
  const staff = await prisma.staff.findMany({ where: { salonId } });
  const services = await prisma.service.findMany({ where: { salonId } });

  console.log(`Found ${staff.length} staff and ${services.length} services`);

  // 1. Create salon working hours (Mon-Sat 9:00-18:00, Sun closed)
  const existingShopHours = await prisma.salonWorkingHours.findMany({ where: { salonId } });
  if (existingShopHours.length === 0) {
    console.log("Creating salon working hours...");
    for (let day = 0; day <= 6; day++) {
      await prisma.salonWorkingHours.create({
        data: {
          salonId,
          dayOfWeek: day,
          isOpen: day !== 0, // Closed on Sunday (0)
          startTime: "09:00",
          endTime: "18:00",
        },
      });
    }
    console.log("Salon working hours created");
  } else {
    console.log("Salon working hours already exist");
  }

  // 2. Link all staff to all services
  console.log("Linking staff to services...");
  for (const s of staff) {
    for (const svc of services) {
      await prisma.staffService.upsert({
        where: {
          staffId_serviceId: { staffId: s.id, serviceId: svc.id },
        },
        update: {},
        create: {
          staffId: s.id,
          serviceId: svc.id,
        },
      });
    }
  }
  console.log(`Linked ${staff.length} staff to ${services.length} services`);

  // 3. Create a sample discount (20% off, Mon-Wed, 10:00-16:00)
  const existingDiscounts = await prisma.discount.findMany({ where: { salonId } });
  if (existingDiscounts.length === 0) {
    console.log("Creating sample discount...");
    const serviceIds = services.map(s => s.id);
    await prisma.discount.create({
      data: {
        name: "Off-Peak Special",
        discountPercent: 20,
        startTime: "10:00",
        endTime: "16:00",
        daysOfWeek: [1, 2, 3], // Mon, Tue, Wed
        serviceIds: serviceIds,
        staffIds: [], // All staff
        isActive: true,
        salonId,
      },
    });
    console.log("Sample discount created");
  } else {
    console.log("Discounts already exist");
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
