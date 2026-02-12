import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SALON_SLUG = "heranailspa";

// Categories to create
const categories = [
  { name: "BIAB- Builder Gel", sortOrder: 0 },
  { name: "Manicure, Pedicure", sortOrder: 1 },
  { name: "Shellac/ Gel", sortOrder: 2 },
  { name: "Nail Extensions", sortOrder: 3 },
];

// Services for BIAB- Builder Gel category
const biabServices = [
  {
    name: "BIAB Overlay (Natural Nails)",
    description: "Builder gel applied over natural nails for strength and durability. Includes nail prep, BIAB application, and gel polish finish.",
    durationMinutes: 60,
    price: 45,
    sortOrder: 0,
  },
  {
    name: "BIAB Infill",
    description: "Maintenance appointment for existing BIAB nails. Includes removal of lifted areas, rebalancing, and fresh gel polish.",
    durationMinutes: 75,
    price: 48,
    sortOrder: 1,
  },
  {
    name: "BIAB New Set with Tips",
    description: "Full set of BIAB nails with tip extensions for added length. Perfect for clients wanting natural-looking extensions.",
    durationMinutes: 90,
    price: 55,
    sortOrder: 2,
  },
  {
    name: "BIAB Removal",
    description: "Safe removal of BIAB overlay. Includes gentle filing and soaking to protect natural nails.",
    durationMinutes: 30,
    price: 15,
    sortOrder: 3,
  },
  {
    name: "BIAB Repair (per nail)",
    description: "Repair of single broken or damaged BIAB nail.",
    durationMinutes: 15,
    price: 5,
    sortOrder: 4,
  },
  {
    name: "BIAB with Nail Art",
    description: "BIAB overlay with custom nail art design. Includes up to 2 accent nails with intricate designs.",
    durationMinutes: 90,
    price: 60,
    sortOrder: 5,
  },
  {
    name: "BIAB French Overlay",
    description: "Classic French manicure style with BIAB. Natural pink base with white tips for timeless elegance.",
    durationMinutes: 75,
    price: 52,
    sortOrder: 6,
  },
  {
    name: "BIAB Ombre",
    description: "Beautiful ombre/gradient effect with BIAB. Seamless color transition for a modern look.",
    durationMinutes: 75,
    price: 55,
    sortOrder: 7,
  },
  {
    name: "BIAB with Chrome/Cat Eye",
    description: "BIAB overlay with chrome or cat eye powder finish for stunning metallic effect.",
    durationMinutes: 75,
    price: 55,
    sortOrder: 8,
  },
  {
    name: "BIAB Manicure Combo",
    description: "BIAB overlay combined with luxury manicure treatment. Includes cuticle care, hand massage, and BIAB application.",
    durationMinutes: 90,
    price: 65,
    sortOrder: 9,
  },
  {
    name: "BIAB Toes",
    description: "BIAB overlay for toenails. Long-lasting, chip-resistant coverage for beautiful feet.",
    durationMinutes: 45,
    price: 38,
    sortOrder: 10,
  },
];

async function main() {
  console.log("🌱 Starting seed script for heranailspa services...\n");

  // Find the salon
  const salon = await prisma.salon.findUnique({
    where: { slug: SALON_SLUG },
  });

  if (!salon) {
    console.error(`❌ Salon with slug "${SALON_SLUG}" not found!`);
    process.exit(1);
  }

  console.log(`✅ Found salon: ${salon.name} (${salon.id})\n`);

  // Get all active staff for this salon
  const activeStaff = await prisma.staff.findMany({
    where: { salonId: salon.id, active: true },
  });

  console.log(`👥 Found ${activeStaff.length} active staff members\n`);

  // Track created items
  const created = {
    categories: 0,
    services: 0,
    staffAssignments: 0,
  };

  // Create categories
  console.log("📁 Creating categories...");
  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const existing = await prisma.serviceCategory.findFirst({
      where: { salonId: salon.id, name: cat.name },
    });

    if (existing) {
      console.log(`   ⏭️  Category "${cat.name}" already exists`);
      categoryMap[cat.name] = existing.id;
    } else {
      const newCategory = await prisma.serviceCategory.create({
        data: {
          salonId: salon.id,
          name: cat.name,
          sortOrder: cat.sortOrder,
        },
      });
      console.log(`   ✅ Created category "${cat.name}"`);
      categoryMap[cat.name] = newCategory.id;
      created.categories++;
    }
  }

  // Create BIAB services
  console.log("\n💅 Creating BIAB services...");
  const biabCategoryId = categoryMap["BIAB- Builder Gel"];

  for (const service of biabServices) {
    const existing = await prisma.service.findFirst({
      where: { salonId: salon.id, name: service.name },
    });

    if (existing) {
      console.log(`   ⏭️  Service "${service.name}" already exists`);
    } else {
      const newService = await prisma.service.create({
        data: {
          salonId: salon.id,
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          price: service.price,
          categoryId: biabCategoryId,
          sortOrder: service.sortOrder,
        },
      });
      console.log(`   ✅ Created service "${service.name}" (£${service.price}, ${service.durationMinutes}min)`);
      created.services++;

      // Assign all active staff to this service
      for (const staff of activeStaff) {
        await prisma.staffService.create({
          data: {
            staffId: staff.id,
            serviceId: newService.id,
          },
        });
        created.staffAssignments++;
      }
      console.log(`      👥 Assigned ${activeStaff.length} staff members`);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 SEED SUMMARY");
  console.log("=".repeat(50));
  console.log(`   Categories created: ${created.categories}`);
  console.log(`   Services created: ${created.services}`);
  console.log(`   Staff assignments: ${created.staffAssignments}`);
  console.log("=".repeat(50));
  console.log("\n✨ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
