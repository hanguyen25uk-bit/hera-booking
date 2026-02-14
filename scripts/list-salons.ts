import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const salons = await prisma.salon.findMany();
  salons.forEach(s => console.log(s.slug, "|", s.name));
}
main().then(() => prisma.$disconnect());
