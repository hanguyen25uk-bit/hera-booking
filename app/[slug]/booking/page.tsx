import { Metadata } from "next";
import { getSalonBySlug } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import BookingClient from "./booking-client";

type Props = {
  params: Promise<{ slug: string }>;
};

// Server-side metadata generation for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);

  if (!salon) {
    return { title: "Book Online | Hera Booking" };
  }

  const title = `${salon.name} [ Book now ] | Hera Booking`;
  const description = `Book online at ${salon.name}. ${salon.address || ""}. Instant confirmation, no account needed, 0% booking fees.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://herabooking.com/${slug}/booking`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// Schema.org JSON-LD for salon
function SalonSchema({ salon }: { salon: { name: string; slug: string; phone: string | null; email: string | null; address: string | null } }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "NailSalon",
    name: salon.name,
    url: `https://herabooking.com/${salon.slug}/booking`,
    telephone: salon.phone || undefined,
    email: salon.email || undefined,
    address: salon.address
      ? {
          "@type": "PostalAddress",
          streetAddress: salon.address,
          addressLocality: "London",
          addressCountry: "GB",
        }
      : undefined,
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `https://herabooking.com/${salon.slug}/booking`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: {
        "@type": "Reservation",
        name: `Book an appointment at ${salon.name}`,
      },
    },
  };

  // Remove undefined values
  const cleanSchema = JSON.parse(JSON.stringify(schema));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanSchema) }}
    />
  );
}

// Schema.org JSON-LD for services
function ServicesSchema({
  salon,
  services,
}: {
  salon: { name: string };
  services: { name: string; description: string | null; price: number }[];
}) {
  if (!services || services.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${salon.name} Services`,
    itemListElement: services.map((service, index) => ({
      "@type": "Service",
      position: index + 1,
      name: service.name,
      description: service.description || undefined,
      offers: service.price
        ? {
            "@type": "Offer",
            price: String(service.price),
            priceCurrency: "GBP",
          }
        : undefined,
      provider: {
        "@type": "NailSalon",
        name: salon.name,
      },
    })),
  };

  const cleanSchema = JSON.parse(JSON.stringify(schema));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanSchema) }}
    />
  );
}

// Server component that fetches data and renders client component
export default async function BookingPage({ params }: Props) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);

  // If salon not found, pass null to client
  if (!salon) {
    return <BookingClient params={params} initialData={null} />;
  }

  // Fetch ALL booking data server-side in parallel (single round-trip)
  const [services, categories, policy, discounts] = await Promise.all([
    prisma.service.findMany({
      where: { salonId: salon.id, isActive: true },
      include: {
        serviceCategory: {
          select: { id: true, name: true, description: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.serviceCategory.findMany({
      where: { salonId: salon.id, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.bookingPolicy.findFirst({
      where: { salonId: salon.id },
    }),
    prisma.discount.findMany({
      where: { salonId: salon.id, isActive: true },
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

  // Prepare initial data for client (serialize dates to strings for JSON compatibility)
  const initialData = {
    salon: {
      id: salon.id,
      name: salon.name,
      slug: salon.slug,
      phone: salon.phone,
      email: salon.email,
      address: salon.address,
    },
    services,
    categories,
    policy: {
      title: policy?.title || "Our Booking Policy",
      policies: policyItems,
    },
    discounts: discounts.map(d => ({
      ...d,
      validFrom: d.validFrom?.toISOString() || null,
      validUntil: d.validUntil?.toISOString() || null,
    })),
  };

  return (
    <>
      {/* SEO Schema markup - rendered server-side */}
      <SalonSchema salon={salon} />
      {services.length > 0 && (
        <ServicesSchema salon={salon} services={services} />
      )}

      {/* Client-side booking form with pre-fetched data */}
      <BookingClient params={params} initialData={initialData} />
    </>
  );
}
