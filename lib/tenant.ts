import { prisma } from "./prisma";

export async function getSalonBySlug(slug: string) {
  return prisma.salon.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      logo: true,
      primaryColor: true,
      phone: true,
      email: true,
      address: true,
      timezone: true,
      currency: true,
      cancelMinutesAdvance: true,
    },
  });
}

export async function getSalonById(id: string) {
  return prisma.salon.findUnique({
    where: { id, isActive: true },
  });
}
