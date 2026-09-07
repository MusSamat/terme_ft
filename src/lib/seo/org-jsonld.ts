import { SITE_URL } from "@/lib/seo/site";

/**
 * schema.org `Service` for the whole platform, emitted once from the root
 * layout. `url`/`provider.url` come from SITE_URL so the JSON-LD, canonical
 * URLs and `metadataBase` always agree (set NEXT_PUBLIC_SITE_URL in prod).
 * Rendered as <script type="application/ld+json"> — no user HTML, JSON.stringify escapes values.
 */
export function buildServiceJsonLd(description: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Terme",
    serviceType: "Ridesharing / Carpooling",
    url: SITE_URL,
    areaServed: { "@type": "Country", name: "Kyrgyzstan" },
    description,
    provider: {
      "@type": "Organization",
      name: "Terme",
      url: SITE_URL,
    },
  };
}

/** schema.org `FAQPage`; `items` must mirror the Q&A visible on /faq. */
export function buildFaqJsonLd(items: readonly { q: string; a: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
