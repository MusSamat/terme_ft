import type { Metadata } from "next";
import { RequestsFeed } from "@/components/features/passenger-requests/requests-feed";
import { absoluteUrl, hreflangAlternates } from "@/lib/seo/site";

// Legacy deep-link route — the unified home `/` renders this same feed in
// driver mode. Kept for shareable /requests?from&to links and notifications.
export const revalidate = 0;

// Self-canonical for the /requests deep-link route.
export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/requests"), languages: hreflangAlternates("/requests") },
};

export default function RequestsPage() {
  return <RequestsFeed />;
}
