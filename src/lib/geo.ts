// Client-side geo helpers for the results map: distances, Kyrgyzstan bounds,
// nearest-first sorting and pin clustering.

export interface LatLng {
  lat: number;
  lng: number;
}

/** Same bounds the API enforces for near_lat / near_lng and meeting points. */
const KG_BBOX = { west: 69, south: 39, east: 81, north: 43.5 };

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function inKg(p: LatLng): boolean {
  return p.lat >= KG_BBOX.south && p.lat <= KG_BBOX.north && p.lng >= KG_BBOX.west && p.lng <= KG_BBOX.east;
}

export type WithDistance<T> = T & { distanceKm: number };

/** Nearest first (stable for equal distances). */
export function sortByDistance<T extends LatLng>(items: readonly T[], from: LatLng): WithDistance<T>[] {
  return items
    .map((it, i) => ({ it: { ...it, distanceKm: haversineKm(from, it) }, i }))
    .sort((a, b) => a.it.distanceKm - b.it.distanceKm || a.i - b.i)
    .map((x) => x.it);
}

export interface PinCluster {
  lat: number;
  lng: number;
  count: number;
  ids: string[];
}

/** Below this zoom pins are grid-clustered; from it only identical points merge. */
export const CLUSTER_MAX_ZOOM = 15;

/**
 * Grid clustering (cell ≈ 64 px at `zoom`, as the server map used to do). From
 * CLUSTER_MAX_ZOOM only pins on the very same spot merge — e.g. several rides
 * without a pin all sitting at the settlement centre.
 */
export function clusterPins<T extends LatLng & { id: string }>(
  pins: readonly T[],
  zoom: number,
): { singles: T[]; clusters: PinCluster[] } {
  const cell = zoom >= CLUSTER_MAX_ZOOM ? null : 90 / 2 ** zoom;
  const groups = new Map<string, T[]>();
  for (const p of pins) {
    const k = cell === null ? `${p.lat.toFixed(5)}:${p.lng.toFixed(5)}` : `${Math.floor(p.lat / cell)}:${Math.floor(p.lng / cell)}`;
    const g = groups.get(k);
    if (g) g.push(p);
    else groups.set(k, [p]);
  }
  const singles: T[] = [];
  const clusters: PinCluster[] = [];
  for (const g of groups.values()) {
    if (g.length === 1) singles.push(g[0]!);
    else
      clusters.push({
        lat: g.reduce((a, p) => a + p.lat, 0) / g.length,
        lng: g.reduce((a, p) => a + p.lng, 0) / g.length,
        count: g.length,
        ids: g.map((p) => p.id),
      });
  }
  return { singles, clusters };
}

/**
 * What the results map fits: every pickup (or the origin when there are none),
 * plus the user when they are within `nearKm` of the origin settlement.
 */
export function routeFitPoints(
  pins: readonly LatLng[],
  origin: LatLng | null,
  me: LatLng | null,
  nearKm = 50,
): LatLng[] {
  const pts = pins.map((p) => ({ lat: p.lat, lng: p.lng }));
  if (!pts.length && origin) pts.push({ lat: origin.lat, lng: origin.lng });
  if (me && origin && haversineKm(me, origin) <= nearKm) pts.push({ lat: me.lat, lng: me.lng });
  return pts;
}

/** «1,2 км» / «850 м» — distance label in the UI language's number format. */
export function formatDistance(km: number, units: { km: string; m: string }): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} ${units.m}`;
  const v = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `${v.toLocaleString("ru-RU")} ${units.km}`;
}
