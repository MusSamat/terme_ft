import type { TripCardItem } from "@/lib/api/trips";
import type { PassengerRequestCardItem } from "@/lib/api/passenger-requests";
import type { MapRouteItem } from "@/lib/api/map";
import { placeName } from "@/lib/places";
import type { LatLng } from "@/lib/geo";
import type { ResultPin } from "./nearby-panel";

type Pin = Omit<ResultPin, "distanceKm">;
type Pt = { lat?: number | null; lng?: number | null } | null | undefined;

const point = (p: Pt): LatLng | null =>
  p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { lat: p.lat!, lng: p.lng! } : null;

/** Pickup point, else the origin settlement; null when neither has coordinates. */
function pin(
  id: string | undefined,
  exactPt: Pt,
  originPt: Pt,
  base: Omit<Pin, "id" | "lat" | "lng" | "exact">,
): Pin | null {
  const exact = point(exactPt);
  const at = exact ?? point(originPt);
  return id && at ? { id, ...at, exact: Boolean(exact), ...base } : null;
}

export function tripPins(trips: TripCardItem[], locale: string): Pin[] {
  return trips.flatMap((tr) => {
    const p = pin(tr.id, tr.originPoint, tr.origin, {
      originName: placeName(tr.origin, locale) || (tr.originCity ?? ""),
      destinationName: placeName(tr.destination, locale) || (tr.destinationCity ?? ""),
      departureAt: tr.departureAt ?? "",
      seats: tr.seatsAvailable ?? 0,
      price: tr.pricePerSeat ?? null,
    });
    return p ? [p] : [];
  });
}

export function requestPins(requests: PassengerRequestCardItem[], locale: string): Pin[] {
  return requests.flatMap((r) => {
    const p = pin(r.id, r.originPoint, r.origin, {
      originName: placeName(r.origin, locale) || r.originCity,
      destinationName: placeName(r.destination, locale) || r.destinationCity,
      departureAt: r.departureDate,
      seats: r.seatsNeeded,
      price: null,
    });
    return p ? [p] : [];
  });
}

/** GET /map/route items — coordinates are always set (pin or settlement). */
export function routeItemPins(items: MapRouteItem[], locale: string): Pin[] {
  return items.map((it) => ({
    id: it.id,
    lat: it.lat,
    lng: it.lng,
    exact: it.exact,
    originName: placeName(it.origin, locale),
    destinationName: placeName(it.destination, locale),
    departureAt: it.departureAt,
    seats: it.seatsFree ?? it.passengers ?? 0,
    price: it.price,
  }));
}

/** Origin settlement of the results (all share the searched origin). */
export function originOf(items: Array<{ origin?: Pt }>): LatLng | null {
  for (const it of items) {
    const p = point(it.origin);
    if (p) return p;
  }
  return null;
}
