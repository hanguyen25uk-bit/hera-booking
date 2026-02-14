import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const salon = await prisma.salon.findUnique({ where: { slug: "heranailspa" } });
  if (!salon) return console.log("No salon found");
  console.log("Salon:", salon.id, salon.name);
  const cats = await prisma.serviceCategory.findMany({ where: { salonId: salon.id } });
  console.log("Categories:", cats.length);
  cats.forEach(c => console.log(c.id, "|", c.name));
}
main().then(() => prisma.$disconnect());
