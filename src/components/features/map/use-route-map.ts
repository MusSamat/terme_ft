import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMapRoute, type MapRouteParams } from "@/lib/api/map";
import type { ResultPin } from "./nearby-panel";
import { routeItemPins } from "./result-pins";

/**
 * All listings of the route for the «Карта» view (GET /map/route). `pins` is
 * null until the first response (or when the route has no place ids / the
 * call failed) — the caller then shows the already-loaded list pages.
 */
export function useRouteMap(query: MapRouteParams | null, locale: string) {
  const { data, isError } = useQuery({
    queryKey: ["map-route", query],
    queryFn: () => getMapRoute(query!),
    enabled: query !== null,
    staleTime: 30_000,
  });
  const live = query !== null && !isError && data !== undefined;
  const pins: Omit<ResultPin, "distanceKm">[] | null = useMemo(
    () => (live ? routeItemPins(data.items, locale) : null),
    [live, data, locale],
  );
  return {
    pins,
    truncated: live && data.truncated,
    nearby: live && data.nearby,
  };
}
