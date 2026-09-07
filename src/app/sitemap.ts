import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { ROUTE_PAIRS } from "@/lib/seo/routes";
import { searchTrips } from "@/lib/api/trips";

export const revalidate = 3600;

const TRIP_CAP = 200;

// Bounded, cursor-paged pull of currently-active trip detail URLs. Never throws
// — a flaky/slow API degrades the sitemap to routes + static pages.
async function activeTripUrls(): Promise<MetadataRoute.Sitemap> {
  const out: MetadataRoute.Sitemap = [];
  let cursor: string | null | undefined;
  try {
    for (let page = 0; page < 10 && out.length < TRIP_CAP; page++) {
      const res = await searchTrips({ limit: 50, ...(cursor ? { cursor } : {}) });
      for (const t of res.data) {
        if (!t.id) continue;
        out.push({
          url: `${SITE_URL}/trips/${t.id}`,
          // Search DTO is card-lean (no createdAt); lastmod omitted for trip URLs.
          changeFrequency: "daily",
          priority: 0.6,
        });
        if (out.length >= TRIP_CAP) break;
      }
      cursor = res.nextCursor;
      if (!cursor) break;
    }
  } catch {
    return out;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/trips`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const routePages: MetadataRoute.Sitemap = ROUTE_PAIRS.map((p) => ({
    url: `${SITE_URL}/route/${p.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const trips = await activeTripUrls();

  return [...staticPages, ...routePages, ...trips];
}
