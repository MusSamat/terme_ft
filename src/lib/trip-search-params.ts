import type { SearchTripsParams } from "@/lib/api/trips";
import { placeFilter, routeFromParams } from "@/lib/places";

// Chips write YYYY-MM-DD; the API wants a full ISO datetime. Anchor the day at
// local Kyrgyzstan midnight (fixed UTC+6, no DST). "today" is a legacy alias.
function normalizeDate(v: string | null): string | undefined {
  if (!v || v === "any") return undefined; // «any» = explicit no-date-filter
  const ymd =
    v === "today"
      ? new Date(Date.now() + 6 * 3_600_000).toISOString().slice(0, 10)
      : /^\d{4}-\d{2}-\d{2}$/.test(v)
        ? v
        : null;
  return ymd ? `${ymd}T00:00:00+06:00` : undefined;
}

function num(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Build the trips-search query object from a URL param getter. Shared by the
 * server page (SSR first paint) and SearchLayout (client refetch on filter
 * change) so both derive IDENTICAL params — the client seed matches the SSR
 * result, and filtering happens client-side without a blocking server round-trip.
 */
export function buildTripSearchParams(get: (k: string) => string | null): SearchTripsParams {
  const { from, to } = routeFromParams(get);
  // sort=nearest needs the viewer point: ?near=lat,lng (set by the client).
  const [nearLat, nearLng] = (get("near") ?? "").split(",").map(Number);
  const near =
    get("sort") === "nearest" && Number.isFinite(nearLat) && Number.isFinite(nearLng)
      ? { near_lat: nearLat, near_lng: nearLng }
      : null;
  return {
    ...placeFilter("from", from),
    ...placeFilter("to", to),
    ...(get("kind") === "airport" ? { kind: "airport" as const } : {}),
    // Default to today (Yandex-style) — the results screen always has a day selected.
    date: normalizeDate(get("date") ?? "today"),
    seats: num(get("seats")),
    min_price: num(get("min_price")),
    max_price: num(get("max_price")),
    min_rating: num(get("min_rating")),
    ...(get("only_verified") === "true" ? { only_verified: true } : {}),
    ...(get("women_only") === "true" ? { women_only: true } : {}),
    ...(get("no_smoking") === "true" ? { no_smoking: true } : {}),
    ...(get("pets") === "true" ? { pets: true } : {}),
    luggage: (get("luggage") as SearchTripsParams["luggage"]) || undefined,
    ...(near ?? {}),
    // nearest without a point falls back to the default order.
    sort: get("sort") === "nearest" && !near ? undefined : (get("sort") as SearchTripsParams["sort"]) || undefined,
    limit: 20,
  };
}
