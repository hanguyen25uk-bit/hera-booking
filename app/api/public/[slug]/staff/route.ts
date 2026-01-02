import { prisma } from "@/lib/prisma";
import { getSalonBySlug } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const serviceId = req.nextUrl.searchParams.get("serviceId");
  
  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  try {
    let staff;
    
    if (serviceId) {
      // Get staff who can perform this service
      staff = await prisma.staff.findMany({
        where: {
          salonId: salon.id,
          active: true,
          staffServices: { some: { serviceId } },
        },
        orderBy: { name: "asc" },
      });
    } else {
      staff = await prisma.staff.findMany({
        where: { salonId: salon.id, active: true },
        orderBy: { name: "asc" },
      });
    }
    
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Fetch staff error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
