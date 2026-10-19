import { api } from "./client";
import type { paths } from "./schema.gen";

export type MapRouteParams = NonNullable<paths["/map/route"]["get"]["parameters"]["query"]>;

type PlaceName = { id: number; nameRu: string; nameKg: string };

// The spec leaves item fields optional; the backend always sends them all
// (terme src/modules/map/mapRoute.service.ts MapRouteItem).
export interface MapRouteItem {
  id: string;
  kind: "trip" | "request";
  /** Meeting pin (exact) or the origin settlement — never null. */
  lat: number;
  lng: number;
  exact: boolean;
  departureAt: string;
  seatsFree: number | null;
  passengers: number | null;
  price: number | null;
  origin: PlaceName;
  destination: PlaceName;
  user: { id: string; name: string; avatarUrl: string | null; rating: number | null; ratingCount: number };
  /** Only with target_time: departure within ±2h of it. */
  nearTarget?: boolean;
}

export interface MapRouteResult {
  kind: "trips" | "requests";
  /** More than 500 listings — only the first 500 are sent. */
  truncated: boolean;
  /** The exact places had nothing; nearby settlements (25 km) were used. */
  nearby: boolean;
  items: MapRouteItem[];
}

/** Every active listing of one route (cap 500), for the «Карта» view. */
export async function getMapRoute(params: MapRouteParams): Promise<MapRouteResult> {
  const { data } = await api.get<MapRouteResult>("/map/route", { params });
  return data;
}
