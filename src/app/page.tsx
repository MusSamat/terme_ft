import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo/site";
import { HomeFeed } from "@/components/features/search/home-feed";

// The home IS the search feed now — role-aware (passenger → trips, driver →
// requests), route-first, with the intent toggle switching in place.
export const revalidate = 0;

// Self-canonical for "/" — without it GSC reports the homepage as
// "Duplicate without user-selected canonical" (reachable via www/non-www,
// trailing slash, etc.). Resolves against metadataBase → https://terme.kg/.
export const metadata: Metadata = {
  alternates: { canonical: "/", languages: hreflangAlternates("/") },
};

export default function HomePage() {
  return <HomeFeed />;
}
