import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { ROUTE_PAIRS } from "@/lib/seo/routes";

export const revalidate = 3600;

// Only evergreen, search-intent URLs belong in the sitemap. Individual
// /trips/{uuid} pages are intentionally excluded: a trip is ephemeral (it
// happens once, then expires), so listing them would push Google to index
// hundreds of short-lived UUID URLs that soon soft-404 — wasting crawl budget
// with zero search value. Search intent is route-based ("Бишкек — Ош
// попутчики") → the money pages are /route/{pair}. Trip pages stay crawlable
// via internal links (robots doesn't block them); we simply don't advertise them.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/trips`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/requests`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const routePages: MetadataRoute.Sitemap = ROUTE_PAIRS.map((p) => ({
    url: `${SITE_URL}/route/${p.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticPages, ...routePages];
}
