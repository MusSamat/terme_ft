import { api } from "./client";
import type { components } from "./schema.gen";

// A settlement of the SOATE directory (or an airport). Trips and requests
// reference places by id; raion / oblast disambiguate homonyms in pickers.
export type Place = components["schemas"]["Place"];
export type MeetingPoint = components["schemas"]["MeetingPoint"];

export type FlightType = "international" | "domestic";

export interface Airport extends Place {
  serves: Place | null;
  /** «Манас · Бишкек», «Ош». */
  titleRu: string;
  titleKg: string;
  /** Default of the international / domestic toggle. */
  flightType: FlightType;
  /** Minutes to be at the airport before departure. */
  departureBufferMin: Record<FlightType, number>;
  /** Quick chips for the other end, served city first. */
  popularDestinations: Place[];
}

export interface PickupSuggestion {
  /** When to leave: flight departure − bufferMin − travelMin. */
  pickupAt: string;
  travelMin: number;
  bufferMin: number;
  distanceKm: number;
  flightType: FlightType;
}

/** One-tap pin inside Бишкек / Ош: a departure spot or a жилмассив. */
export interface MeetingSpot {
  kind: "spot" | "area";
  nameRu: string;
  nameKg: string;
  lat: number;
  lng: number;
}

export interface PopularRoute {
  from: string;
  to: string;
  fromId: number;
  toId: number;
  tripCount: number;
  minPrice: number | null;
}

/** Most prominent places (capitals, airports, cities) — the empty-query list. */
export async function getTopPlaces(limit = 8): Promise<Place[]> {
  const { data } = await api.get<{ data: Place[] }>("/cities", { params: { limit } });
  return data.data;
}

// The directory is static within a session — cache each query so
// backspacing/retyping never re-hits the network.
const searchCache = new Map<string, Place[]>();
const SEARCH_CACHE_MAX = 200;

/** scope=any also finds районы / айыл аймактары / city districts (airport transfers). */
export async function searchPlaces(q: string, limit = 10, scope?: "any"): Promise<Place[]> {
  const query = q.trim();
  if (!query) return [];
  const key = `${query.toLowerCase()}|${limit}|${scope ?? ""}`;
  const cached = searchCache.get(key);
  if (cached) return cached;
  const { data } = await api.get<{ data: Place[] }>("/cities", { params: { q: query, limit, scope } });
  if (searchCache.size >= SEARCH_CACHE_MAX) {
    const first = searchCache.keys().next().value;
    if (first !== undefined) searchCache.delete(first);
  }
  searchCache.set(key, data.data);
  return data.data;
}

/** The settlement a GPS point is in — prefills «Откуда». */
export async function nearestPlace(lat: number, lng: number): Promise<Place | null> {
  const { data } = await api.get<{ data: Place | null }>("/cities/nearest", { params: { lat, lng } });
  return data.data;
}

export async function getSpots(placeId: number, q?: string): Promise<MeetingSpot[]> {
  const { data } = await api.get<{ data: MeetingSpot[] }>(`/cities/${placeId}/spots`, {
    params: q ? { q } : undefined,
  });
  return data.data;
}

export async function getAirports(): Promise<Airport[]> {
  const { data } = await api.get<{ data: Airport[] }>("/cities/airports");
  return data.data;
}

export async function getPickupSuggestion(
  airportId: number,
  params: { from_id: number; flight_time: string; flight_type?: FlightType },
): Promise<PickupSuggestion> {
  const { data } = await api.get<{ data: PickupSuggestion }>(`/cities/airports/${airportId}/pickup-suggestion`, {
    params,
  });
  return data.data;
}

export async function getPopularRoutes(): Promise<PopularRoute[]> {
  const { data } = await api.get<{ data: PopularRoute[] }>("/cities/popular-routes");
  return data.data;
}
