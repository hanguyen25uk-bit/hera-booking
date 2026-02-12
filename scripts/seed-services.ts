import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SALON_SLUG = "heranailspa";

// Categories to create
const categories = [
  { name: "BIAB- Builder Gel", sortOrder: 0 },
  { name: "Manicure, Pedicure", sortOrder: 1 },
  { name: "Shellac/ Gel", sortOrder: 2 },
  { name: "Nail Extensions (with Shellac/Gel)", sortOrder: 3 },
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

// Services for Manicure, Pedicure category
const maniPediServices = [
  {
    name: "Normal Pedicure",
    description: "Includes 5 min buffer",
    durationMinutes: 45,
    price: 30,
    sortOrder: 0,
  },
  {
    name: "French Shellac Pedicure",
    description: "Includes 5 min buffer",
    durationMinutes: 45,
    price: 43,
    sortOrder: 1,
  },
  {
    name: "French Shellac Manicure",
    description: "Includes 5 min buffer",
    durationMinutes: 45,
    price: 35,
    sortOrder: 2,
  },
  {
    name: "Shellac Mani & Pedi",
    description: "Includes 5 min buffer",
    durationMinutes: 90,
    price: 65,
    sortOrder: 3,
  },
  {
    name: "Shellac/Gel Manicure",
    description: null,
    durationMinutes: 30,
    price: 30,
    sortOrder: 4,
  },
  {
    name: "Shellac/Gel Pedicure",
    description: null,
    durationMinutes: 60,
    price: 38,
    sortOrder: 5,
  },
];

// Services for Shellac/ Gel category
const shellacGelServices = [
  {
    name: "French Shellac Toes",
    description: "Includes 5 min buffer",
    durationMinutes: 30,
    price: 33,
    sortOrder: 0,
  },
  {
    name: "French Shellac Hands",
    description: null,
    durationMinutes: 40,
    price: 28,
    sortOrder: 1,
  },
  {
    name: "Shellac/Gel Toes",
    description: "Includes 5 min buffer",
    durationMinutes: 30,
    price: 28,
    sortOrder: 2,
  },
  {
    name: "Removal & Redo Shellac/Gel Hands",
    description: "Includes 5 min buffer",
    durationMinutes: 30,
    price: 28,
    sortOrder: 3,
  },
  {
    name: "Shellac/Gel Hands",
    description: "Includes 5 min buffer",
    durationMinutes: 30,
    price: 23,
    sortOrder: 4,
  },
];

// Services for Nail Extensions (with Shellac/Gel) category
const nailExtensionsServices = [
  {
    name: "A fullset acrylic with complex nail art",
    description: null,
    durationMinutes: 90,
    price: 70,
    sortOrder: 0,
  },
  {
    name: "Infill Acrylic with French Tips",
    description: null,
    durationMinutes: 45,
    price: 35,
    sortOrder: 1,
  },
  {
    name: "Infill Acrylic Powder (with Shellac/Gel)",
    description: "Includes 5 min buffer",
    durationMinutes: 30,
    price: 30,
    sortOrder: 2,
  },
  {
    name: "SNS Dipping Powder Overlay (Natural Nails)",
    description: "Includes 5 min buffer",
    durationMinutes: 45,
    price: 35,
    sortOrder: 3,
  },
  {
    name: "Ombre Nail Extensions",
    description: "Includes 5 min buffer",
    durationMinutes: 60,
    price: 42,
    sortOrder: 4,
  },
  {
    name: "Removal & Redo New Set Acrylic Nail Extensions",
    description: "Includes 5 min buffer",
    durationMinutes: 75,
    price: 43,
    sortOrder: 5,
  },
  {
    name: "Acrylic Nail Extensions with French Tips",
    description: "Includes 5 min buffer",
    durationMinutes: 60,
    price: 43,
    sortOrder: 6,
  },
  {
    name: "Acrylic Powder Nail Extensions with shellac/gel",
    description: "Includes 5 min buffer",
    durationMinutes: 60,
    price: 38,
    sortOrder: 7,
  },
];

// Helper function to create services for a category
async function createServicesForCategory(
  services: Array<{ name: string; description: string | null; durationMinutes: number; price: number; sortOrder: number }>,
  categoryId: string,
  categoryName: string,
  salonId: string,
  activeStaff: Array<{ id: string; name: string }>,
  created: { categories: number; services: number; staffAssignments: number }
) {
  console.log(`\n💅 Creating ${categoryName} services...`);

  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: { salonId: salonId, name: service.name },
    });

    if (existing) {
      console.log(`   ⏭️  Service "${service.name}" already exists`);
    } else {
      const newService = await prisma.service.create({
        data: {
          salonId: salonId,
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          price: service.price,
          categoryId: categoryId,
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
}

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

  // Create services for each category
  await createServicesForCategory(
    biabServices,
    categoryMap["BIAB- Builder Gel"],
    "BIAB- Builder Gel",
    salon.id,
    activeStaff,
    created
  );

  await createServicesForCategory(
    maniPediServices,
    categoryMap["Manicure, Pedicure"],
    "Manicure, Pedicure",
    salon.id,
    activeStaff,
    created
  );

  await createServicesForCategory(
    shellacGelServices,
    categoryMap["Shellac/ Gel"],
    "Shellac/ Gel",
    salon.id,
    activeStaff,
    created
  );

  await createServicesForCategory(
    nailExtensionsServices,
    categoryMap["Nail Extensions (with Shellac/Gel)"],
    "Nail Extensions (with Shellac/Gel)",
    salon.id,
    activeStaff,
    created
  );

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
