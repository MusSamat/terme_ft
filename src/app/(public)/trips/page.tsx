import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { searchTrips } from "@/lib/api/trips";
import { buildTripSearchParams } from "@/lib/trip-search-params";
import { routeFromParams } from "@/lib/places";
import { SearchLayout } from "@/components/features/search/search-layout";

export const revalidate = 0;

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// Shared builder (same logic as SearchLayout's client-side filtering) fed by the
// Next server-searchParams record.
function paramsFromSearch(sp: Props["searchParams"]) {
  return buildTripSearchParams((k) => str(sp[k]) ?? null);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const t = await getTranslations("trips_meta");
  const params = paramsFromSearch(searchParams);
  // Id-based URLs carry names in from/to (from_city only on legacy links).
  const route = routeFromParams((k) => str(searchParams[k]) ?? null);
  const from = route.from?.nameRu;
  const to = route.to?.nameRu;
  if (!from || !to) {
    return {
      title: t("all_trips"),
      description: t("all_trips_desc"),
    };
  }
  const hasDate = params.date ? "yes" : "no";
  const date = params.date ?? "";
  const title = t("route_title", { from, to, hasDate, date });
  return {
    title,
    description: t("route_desc", { from, to, hasDate, date }),
    alternates: {
      canonical: `/trips?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    },
  };
}

export default async function TripsPage({ searchParams }: Props) {
  const params = paramsFromSearch(searchParams);

  // One page: SearchLayout keeps the search header always visible and shows the
  // entry hints (recent/popular) until both cities are set — no separate gate
  // screen. SSR-seed the first page only when a route is present.
  let initial;
  if ((params.from_id || params.from_city) && (params.to_id || params.to_city)) {
    try {
      initial = await searchTrips(params);
    } catch {
      // No seed: the client query refetches and shows a real error state
      // instead of an «empty» result.
      initial = undefined;
    }
  }

  return <SearchLayout initial={initial} />;
}
