import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // Single query to get salon with all related data
    const salon = await prisma.salon.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        primaryColor: true,
        phone: true,
        email: true,
        address: true,
        timezone: true,
        currency: true,
      },
    });

    if (!salon) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    // Parallel queries for all booking data
    const [services, categories, policy, discounts, extras] = await Promise.all([
      // Active services with category info
      prisma.service.findMany({
        where: { salonId: salon.id, isActive: true },
        include: {
          serviceCategory: {
            select: { id: true, name: true, description: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),

      // Active categories
      prisma.serviceCategory.findMany({
        where: { salonId: salon.id, isActive: true },
        orderBy: { sortOrder: "asc" },
      }),

      // Booking policy
      prisma.bookingPolicy.findFirst({
        where: { salonId: salon.id },
      }),

      // Active discounts (only currently valid ones)
      prisma.discount.findMany({
        where: {
          salonId: salon.id,
          isActive: true,
        },
      }),

      // Active extras/additions
      prisma.extra.findMany({
        where: {
          salonId: salon.id,
          isActive: true,
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    // Parse policy items
    let policyItems: { icon: string; title: string; description: string }[] = [];
    if (policy?.policies) {
      try {
        policyItems = JSON.parse(policy.policies);
      } catch {
        policyItems = [];
      }
    }

    return NextResponse.json({
      salon,
      services,
      categories,
      policy: {
        title: policy?.title || "Our Booking Policy",
        policies: policyItems,
      },
      discounts,
      extras,
    });
  } catch (error) {
    console.error("Booking data error:", error);
    return NextResponse.json(
      { error: "Failed to load booking data" },
      { status: 500 }
    );
  }
}
