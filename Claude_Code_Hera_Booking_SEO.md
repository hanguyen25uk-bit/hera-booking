# Hera Booking — SEO for Salon Booking Pages

## Context

Hera Booking (herabooking.com) is a Next.js + Prisma + PostgreSQL salon booking platform. Each salon has a booking page at `herabooking.com/[slug]/booking`.

**Problem:** When someone searches a salon name on Google (e.g. "Hera Nail Spa"), the Hera Booking page doesn't appear well in results because:
1. The page renders client-side — Google sees "Loading..." instead of content
2. No meta tags (title, description) specific to each salon
3. No Schema markup (JSON-LD) for Google rich results
4. The page may have noindex or be blocked by robots.txt

**Goal:** Make each salon's booking page appear on Google like Setmore does — e.g.:
```
HERA NAIL SPA [ Book now ] | Hera Booking
https://herabooking.com/hera-nail-spa/booking
Book online at Hera Nail Spa, 336 Balham High Road, Tooting Bec...
```

## IMPORTANT: Work on develop branch

```bash
git checkout develop
```

All changes must be on `develop` branch. Do NOT commit to `main`.

## Task 1: Add generateMetadata to booking page

Find the booking page file (likely `src/app/[slug]/booking/page.tsx` or similar path).

Add server-side metadata that fetches salon data from the database:

```tsx
import { Metadata } from 'next';

// Adjust this import to match the existing data fetching pattern in the codebase
// Look at how other pages fetch salon data and follow the same pattern

export async function generateMetadata({ params }): Promise<Metadata> {
  const salon = await getSalonBySlug(params.slug); // Use whatever function already exists
  
  if (!salon) {
    return { title: 'Book Online | Hera Booking' };
  }

  const title = `${salon.name} [ Book now ] | Hera Booking`;
  const description = `Book online at ${salon.name}. ${salon.address || ''}. Instant confirmation, no account needed, 0% booking fees.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://herabooking.com/${params.slug}/booking`,
    },
    // IMPORTANT: Do NOT add noindex here
    robots: {
      index: true,
      follow: true,
    },
  };
}
```

**Key points:**
- Look at how the existing page fetches salon data and reuse that pattern
- The salon name, address, phone, services should already be in the database (Prisma)
- If there's a `getSalon`, `findSalon`, or similar function, use it
- Title format must be: `SALON NAME [ Book now ] | Hera Booking`

## Task 2: Add Schema JSON-LD markup

In the same booking page component, add a JSON-LD script tag that renders server-side.

Create a reusable component or add directly to the page:

```tsx
function SalonSchema({ salon }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "NailSalon", // Use "BeautySalon" if not all are nail salons
    "name": salon.name,
    "url": `https://herabooking.com/${salon.slug}/booking`,
    "telephone": salon.phone || undefined,
    "email": salon.email || undefined,
    "address": salon.address ? {
      "@type": "PostalAddress",
      "streetAddress": salon.address,
      "addressLocality": salon.city || "London",
      "addressCountry": "GB"
    } : undefined,
    "potentialAction": {
      "@type": "ReserveAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `https://herabooking.com/${salon.slug}/booking`,
        "actionPlatform": [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform"
        ]
      },
      "result": {
        "@type": "Reservation",
        "name": `Book an appointment at ${salon.name}`
      }
    }
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
```

Add `<SalonSchema salon={salon} />` inside the page component's return, before the main content.

**If salon has services in the database**, also add an ItemList schema:

```tsx
function ServicesSchema({ salon, services }) {
  if (!services || services.length === 0) return null;
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${salon.name} Services`,
    "itemListElement": services.map((service, index) => ({
      "@type": "Service",
      "position": index + 1,
      "name": service.name,
      "description": service.description || undefined,
      "offers": service.price ? {
        "@type": "Offer",
        "price": String(service.price),
        "priceCurrency": "GBP"
      } : undefined,
      "provider": {
        "@type": "NailSalon",
        "name": salon.name
      }
    }))
  };

  const cleanSchema = JSON.parse(JSON.stringify(schema));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanSchema) }}
    />
  );
}
```

## Task 3: Check and fix robots.txt

Find `robots.txt` (usually in `public/robots.txt` or generated in `src/app/robots.ts`).

**Ensure booking pages are NOT blocked:**

```txt
User-agent: *
Allow: /
Sitemap: https://herabooking.com/sitemap.xml
```

If there's a `Disallow: /*/booking` or similar rule blocking booking pages, REMOVE it.

Also check if there are any `<meta name="robots" content="noindex">` tags being added globally — remove them from booking pages.

## Task 4: Add or update sitemap

If there's a sitemap file (check `src/app/sitemap.ts` or `public/sitemap.xml`), add booking pages:

```tsx
// src/app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all active salons from database
  const salons = await prisma.salon.findMany({
    where: { isActive: true }, // adjust field name to match your schema
    select: { slug: true, updatedAt: true },
  });

  const salonPages = salons.map((salon) => ({
    url: `https://herabooking.com/${salon.slug}/booking`,
    lastModified: salon.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: 'https://herabooking.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...salonPages,
  ];
}
```

## Task 5: Verify SSR is working

After making changes, verify the page renders server-side:

```bash
# Build and check
npm run build

# Or check with curl after running dev server
curl -s http://localhost:3000/victoria-nail-bar-1/booking | head -50
```

The HTML response should contain:
- `<title>Victoria Nail Bar [ Book now ] | Hera Booking</title>`
- `<meta name="description" content="Book online at Victoria Nail Bar..."`
- `<script type="application/ld+json">` with salon Schema

If curl shows "Loading..." or empty content, the page is still client-side rendered and needs to be converted to server component or use server-side data fetching.

## Task 6: Test

1. Run `npm run build` — should have no errors
2. Run `npm run dev` — open booking pages, view source to confirm meta tags
3. Test Schema at: https://search.google.com/test/rich-results (paste the preview URL)

## Task 7: Commit

```bash
git add .
git commit -m "feat: add SEO metadata and Schema markup to salon booking pages"
git push origin develop
```

Do NOT merge to main yet — will test on Vercel preview first.

## Summary of files to modify

1. `src/app/[slug]/booking/page.tsx` — add generateMetadata + Schema JSON-LD
2. `public/robots.txt` or `src/app/robots.ts` — ensure booking pages allowed
3. `src/app/sitemap.ts` — add salon booking pages to sitemap
4. Any layout files that might add global noindex — remove for booking pages

## Notes

- Use the existing database fetching patterns — don't create new Prisma queries if helpers already exist
- The salon data (name, address, phone, services, prices) should already be in the database
- All salon booking pages share the same template — changes to one apply to all
- Keep the booking page component itself unchanged — only add metadata and Schema
