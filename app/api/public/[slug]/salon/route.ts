import { NextRequest, NextResponse } from "next/server";
import { getSalonBySlug } from "@/lib/tenant";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: salon.id,
    name: salon.name,
    slug: salon.slug,
    phone: salon.phone,
    address: salon.address,
    email: salon.email,
    logo: salon.logo,
    primaryColor: salon.primaryColor,
  });
}
