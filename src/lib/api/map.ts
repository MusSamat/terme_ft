import { api } from "./client";
export interface MapListingsResult {
  items: Array<{
    id: string;
    lat: number;
    lng: number;
    /** false = no pin, the settlement centre. */
    exact: boolean;
    originCity: string;
    destinationCity: string;
    destinationCityId: number;
    departureAt: string;
    seats: number;
    price: number | null;
  }>;
  clusters: Array<{ lat: number; lng: number; count: number }>;
}
export type MapItem = MapListingsResult["items"][number];

export interface MapQuery {
  kind: "trips" | "requests";
  bbox: { west: number; south: number; east: number; north: number };
  zoom: number;
  toId?: number;
  ride?: "intercity" | "airport";
  date?: string;
}

/** Listings in a viewport, grid-clustered by the server for the zoom level. */
export async function getMapListings(q: MapQuery): Promise<MapListingsResult> {
  const { west, south, east, north } = q.bbox;
  const { data } = await api.get<MapListingsResult>("/map", {
    params: {
      kind: q.kind,
      bbox: [west, south, east, north].map((n) => n.toFixed(4)).join(","),
      zoom: Math.round(q.zoom),
      ...(q.toId ? { to_id: q.toId } : {}),
      ...(q.ride ? { ride: q.ride } : {}),
      ...(q.date ? { date: q.date } : {}),
    },
  });
  return data;
}
