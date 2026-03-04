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

  // Fetch services for Schema markup
  let services: { name: string; description: string | null; price: number }[] = [];
  if (salon) {
    services = await prisma.service.findMany({
      where: { salonId: salon.id, isActive: true },
      select: { name: true, description: true, price: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  return (
    <>
      {/* SEO Schema markup - rendered server-side */}
      {salon && <SalonSchema salon={salon} />}
      {salon && services.length > 0 && (
        <ServicesSchema salon={salon} services={services} />
      )}

      {/* Client-side booking form */}
      <BookingClient params={params} />
    </>
  );
}
