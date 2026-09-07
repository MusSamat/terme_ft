import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

const ALLOW = ["/", "/trips", "/trips/*", "/route/*", "/drivers/*", "/requests"];

// Private/app-only areas stay out of every index, human or AI.
const DISALLOW = [
  "/my/*",
  "/profile/*",
  "/admin/*",
  "/auth/*",
  "/chat",
  "/notifications",
  "/loyalty",
  "/complaint",
  "/onboarding",
  "/dev/*",
];

// AI answer-engine crawlers, explicitly welcomed to the public content (GEO).
const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: ALLOW, disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
