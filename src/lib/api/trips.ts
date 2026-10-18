import { api } from "./client";
import type { components } from "./schema.gen";
import type { EngagementFields } from "./types";
import { getAnonId } from "@/lib/utils/anon-id";

// Extend schema-gen types with runtime fields not yet in the generated spec
type GeneratedTripListItem = components["schemas"]["TripListItem"];
export type TripListItem = Omit<GeneratedTripListItem, "driver" | "metrics"> & {
  driver?: (Omit<NonNullable<GeneratedTripListItem["driver"]>, "car"> & {
    car?: ({
      make?: string;
      model?: string;
      color?: string;
      plate?: string;
      photoUrl?: string | null;
    }) | null;
    tripsCount?: number;
  }) | null;
} & EngagementFields;
export type TripDetail = Omit<components["schemas"]["TripDetail"], "metrics"> & EngagementFields;

// Lean card DTO returned by GET /trips (search/browse) — a strict subset of
// TripListItem carrying only what the ride card renders. The full trip is
// fetched via getTrip() when a card is opened. Keep in sync with the backend
// TripCardItem schema and the TripCard component.
export type TripCardItem = Pick<
  TripListItem,
  | "id"
  | "driverId"
  | "driver"
  | "kind"
  | "originCityId"
  | "destinationCityId"
  | "originCity"
  | "destinationCity"
  | "origin"
  | "destination"
  | "originPoint"
  | "pickupCities"
  | "departureAt"
  | "departureWindowEnd"
  | "seatsAvailable"
  | "pricePerSeat"
  | "status"
  | "liked"
> & { distanceKm?: number };

export interface SearchTripsParams {
  from_id?: number;
  to_id?: number;
  /** Name fallback (SEO pages, old links) when no id is known. */
  from_city?: string;
  to_city?: string;
  kind?: "intercity" | "airport";
  near_lat?: number;
  near_lng?: number;
  date?: string;
  seats?: number;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  only_verified?: boolean;
  women_only?: boolean;
  no_smoking?: boolean;
  pets?: boolean;
  luggage?: "yes" | "small" | "no";
  sort?: "time" | "price_asc" | "rating_desc" | "nearest";
  cursor?: string;
  limit?: number;
}

export interface TripSearchResult {
  /** true = exact city had no results; page shows same-raion (sub-city) matches */
  nearby?: boolean;
  data: TripCardItem[];
  nextCursor: string | null;
}

export async function searchTrips(params: SearchTripsParams): Promise<TripSearchResult> {
  const { data } = await api.get<TripSearchResult>("/trips", { params });
  return data;
}

/** Per-day active-trip counts for a route — calendar availability hints. */
export async function getTripsCalendar(fromId: number, toId: number): Promise<Record<string, number>> {
  const { data } = await api.get<{ data: { date: string; count: number }[] }>("/trips/calendar", {
    params: { from_id: fromId, to_id: toId },
  });
  return Object.fromEntries(data.data.map((d) => [d.date, d.count]));
}

export async function getTrip(id: string): Promise<TripDetail> {
  const { data } = await api.get<TripDetail>(`/trips/${id}`);
  return data;
}

/** Manual ±1 seat adjust — phone deals happen off-platform («занято по телефону»). */
export async function adjustTripSeats(id: string, delta: 1 | -1): Promise<TripDetail> {
  const { data } = await api.post<TripDetail>(`/trips/${id}/seats`, { delta });
  return data;
}

export interface TripPatchInput {
  pricePerSeat?: number;
  priceNegotiable?: boolean;
  comment?: string | null;
  luggage?: "yes" | "small" | "no";
  /** Merged into the stored preferences server-side. */
  preferences?: Record<string, boolean>;
  originPoint?: { lat: number; lng: number; address?: string } | null;
  destinationPoint?: { lat: number; lng: number; address?: string } | null;
}

export async function updateTrip(id: string, patch: TripPatchInput): Promise<TripDetail> {
  const { data } = await api.patch<TripDetail>(`/trips/${id}`, patch);
  return data;
}

export async function cancelTrip(id: string, reason?: string): Promise<void> {
  await api.delete(`/trips/${id}`, reason ? { data: { reason } } : undefined);
}

export async function likeTrip(id: string): Promise<{ liked: true }> {
  const { data } = await api.post<{ liked: true }>(`/trips/${id}/like`);
  return data;
}

export async function unlikeTrip(id: string): Promise<{ liked: false }> {
  const { data } = await api.delete<{ liked: false }>(`/trips/${id}/like`);
  return data;
}

/** Record a unique view (deduped server-side by user / anon id). */
export async function recordTripView(id: string): Promise<void> {
  await api.post(`/trips/${id}/view`, { anonId: getAnonId() });
}

export async function completeTrip(id: string): Promise<{ status: 'completed' }> {
  const { data } = await api.patch<{ status: 'completed' }>(`/trips/${id}/complete`);
  return data;
}

/** Average price on a route over the last 30 days (null when < 3 samples). */
export async function getPriceSuggestion(
  fromId: number,
  toId: number,
): Promise<{ averagePrice: number | null; sampleSize: number }> {
  const { data } = await api.get<{ averagePrice: number | null; sampleSize: number }>(
    "/routes/price-suggestion",
    { params: { from_id: fromId, to_id: toId } },
  );
  return data;
}
