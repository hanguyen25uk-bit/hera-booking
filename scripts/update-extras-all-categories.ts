import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Update all extras to have empty categoryIds (applies to all)
  const result = await prisma.extra.updateMany({
    data: { categoryIds: [] }
  });
  console.log("Updated", result.count, "extras to apply to all categories");
}

main().then(() => prisma.$disconnect());
