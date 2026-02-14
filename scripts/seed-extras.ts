import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SALON_SLUG = "heranailspa";

// Extras for BIAB category
const biabExtras = [
  { name: "Chrome", price: 8, priceFrom: false, sortOrder: 0 },
  { name: "Cat Eye", price: 8, priceFrom: false, sortOrder: 1 },
  { name: "French Tips", price: 5, priceFrom: false, sortOrder: 2 },
  { name: "Simple Nail Art", price: 12, priceFrom: true, sortOrder: 3 },
  { name: "Complex Nail Art", price: 25, priceFrom: true, sortOrder: 4 },
];

async function main() {
  // Find salon
  const salon = await prisma.salon.findUnique({ where: { slug: SALON_SLUG } });
  if (!salon) {
    console.error("Salon not found:", SALON_SLUG);
    return;
  }
  console.log("Found salon:", salon.name);

  // Find BIAB category
  const biabCategory = await prisma.serviceCategory.findFirst({
    where: { salonId: salon.id, name: { contains: "BIAB", mode: "insensitive" } },
  });

  if (!biabCategory) {
    console.error("BIAB category not found");
    return;
  }
  console.log("Found BIAB category:", biabCategory.name, biabCategory.id);

  // Create extras
  for (const extra of biabExtras) {
    const existing = await prisma.extra.findFirst({
      where: { salonId: salon.id, name: extra.name },
    });

    if (existing) {
      console.log("Extra already exists:", extra.name);
      continue;
    }

    const created = await prisma.extra.create({
      data: {
        salonId: salon.id,
        name: extra.name,
        price: extra.price,
        priceFrom: extra.priceFrom,
        sortOrder: extra.sortOrder,
        categoryIds: [biabCategory.id], // Link to BIAB category
        isActive: true,
      },
    });
    console.log("Created extra:", created.name, "£" + created.price);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
