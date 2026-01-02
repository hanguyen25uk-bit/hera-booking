import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Salon
  const salon = await prisma.salon.create({
    data: {
      id: "victoria-nail-bar",
      slug: "victoria-nail-bar",
      name: "Victoria Nail Bar",
      phone: "020 7123 4567",
      address: "123 Victoria Street, London SW1E 5ND",
      email: "hello@victorianailbar.com",
      primaryColor: "#6366f1",
      currency: "GBP",
      timezone: "Europe/London",
      cancelMinutesAdvance: 60,
    },
  });
  console.log("✅ Created salon:", salon.name);

  // 2. Create Service Categories
  const acrylicCategory = await prisma.serviceCategory.create({
    data: {
      name: "Acrylic",
      description: "Professional acrylic nail services",
      sortOrder: 1,
      salonId: salon.id,
    },
  });

  const gelCategory = await prisma.serviceCategory.create({
    data: {
      name: "Gel",
      description: "Long-lasting gel nail services",
      sortOrder: 2,
      salonId: salon.id,
    },
  });

  const manicureCategory = await prisma.serviceCategory.create({
    data: {
      name: "Manicure",
      description: "Classic manicure services",
      sortOrder: 3,
      salonId: salon.id,
    },
  });
  console.log("✅ Created categories");

  // 3. Create Services
  const services = await Promise.all([
    // Acrylic
    prisma.service.create({
      data: {
        name: "Acrylic Full Set",
        description: "Complete acrylic nail application with your choice of shape and length",
        durationMinutes: 90,
        price: 45,
        sortOrder: 1,
        salonId: salon.id,
        categoryId: acrylicCategory.id,
      },
    }),
    prisma.service.create({
      data: {
        name: "Acrylic Infill",
        description: "Maintenance for existing acrylic nails",
        durationMinutes: 60,
        price: 30,
        sortOrder: 2,
        salonId: salon.id,
        categoryId: acrylicCategory.id,
      },
    }),
    // Gel
    prisma.service.create({
      data: {
        name: "Gel Polish Manicure",
        description: "Long-lasting gel polish application",
        durationMinutes: 45,
        price: 28,
        sortOrder: 1,
        salonId: salon.id,
        categoryId: gelCategory.id,
      },
    }),
    prisma.service.create({
      data: {
        name: "Gel Extension",
        description: "Gel nail extensions for added length",
        durationMinutes: 75,
        price: 40,
        sortOrder: 2,
        salonId: salon.id,
        categoryId: gelCategory.id,
      },
    }),
    // Manicure
    prisma.service.create({
      data: {
        name: "Classic Manicure",
        description: "Traditional manicure with nail shaping and polish",
        durationMinutes: 30,
        price: 18,
        sortOrder: 1,
        salonId: salon.id,
        categoryId: manicureCategory.id,
      },
    }),
    prisma.service.create({
      data: {
        name: "Luxury Manicure",
        description: "Pamper treatment with massage and premium products",
        durationMinutes: 45,
        price: 28,
        sortOrder: 2,
        salonId: salon.id,
        categoryId: manicureCategory.id,
      },
    }),
  ]);
  console.log("✅ Created", services.length, "services");

  // 4. Create Staff
  const staffMembers = await Promise.all([
    prisma.staff.create({
      data: {
        name: "Lisa",
        role: "Senior Nail Technician",
        salonId: salon.id,
      },
    }),
    prisma.staff.create({
      data: {
        name: "Mai",
        role: "Nail Technician",
        salonId: salon.id,
      },
    }),
    prisma.staff.create({
      data: {
        name: "Sophie",
        role: "Nail Technician",
        salonId: salon.id,
      },
    }),
    prisma.staff.create({
      data: {
        name: "Emma",
        role: "Junior Technician",
        salonId: salon.id,
      },
    }),
  ]);
  console.log("✅ Created", staffMembers.length, "staff members");

  // 5. Create Staff Services (all staff can do all services)
  for (const staff of staffMembers) {
    for (const service of services) {
      await prisma.staffService.create({
        data: {
          staffId: staff.id,
          serviceId: service.id,
        },
      });
    }
  }
  console.log("✅ Assigned services to staff");

  // 6. Create Working Hours (Mon-Sat 9:00-18:00)
  const days = [1, 2, 3, 4, 5, 6]; // Mon-Sat
  for (const staff of staffMembers) {
    for (const day of days) {
      await prisma.workingHours.create({
        data: {
          staffId: staff.id,
          salonId: salon.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          isWorking: true,
        },
      });
    }
    // Sunday off
    await prisma.workingHours.create({
      data: {
        staffId: staff.id,
        salonId: salon.id,
        dayOfWeek: 0,
        startTime: "09:00",
        endTime: "18:00",
        isWorking: false,
      },
    });
  }
  console.log("✅ Created working hours");

  // 7. Create Booking Policy
  await prisma.bookingPolicy.create({
    data: {
      salonId: salon.id,
      title: "Our Booking Policy",
      policies: JSON.stringify([
        {
          icon: "💳",
          title: "Payment",
          description: "Payment is due at the end of your appointment. We accept cash and card.",
        },
        {
          icon: "⏰",
          title: "Cancellation",
          description: "Please give at least 24 hours notice for cancellations.",
        },
        {
          icon: "🚫",
          title: "No-Show Policy",
          description: "After 3 no-shows, booking will be restricted.",
        },
        {
          icon: "⌚",
          title: "Late Arrivals",
          description: "Please arrive on time. Late arrivals may result in shortened service.",
        },
      ]),
    },
  });
  console.log("✅ Created booking policy");

  console.log("\n🎉 Seeding completed!");
  console.log(`\n📍 Booking URL: /victoria-nail-bar/booking`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
