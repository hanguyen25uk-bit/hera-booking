import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all active salons from database
  const salons = await prisma.salon.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  const salonPages = salons.map((salon) => ({
    url: `https://herabooking.com/${salon.slug}/booking`,
    lastModified: salon.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: "https://herabooking.com",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://herabooking.com/login",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://herabooking.com/signup",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...salonPages,
  ];
}
