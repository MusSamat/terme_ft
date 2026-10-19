// Client-side geo helpers for the map: distances, Kyrgyzstan bounds and the
// «nearest first» radius expansion (10 → 30 → 100 km → whole country).

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Same bounds the API enforces for near_lat / near_lng and meeting points. */
export const KG_BBOX: BBox = { west: 69, south: 39, east: 81, north: 43.5 };

export const NEARBY_RADII_KM = [10, 30, 100] as const;

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

/** Bounding box enclosing a circle of `km` around `c`. */
export function bboxAround(c: LatLng, km: number): BBox {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(0.01, Math.cos(rad(c.lat))));
  return { west: c.lng - dLng, south: c.lat - dLat, east: c.lng + dLng, north: c.lat + dLat };
}

export type WithDistance<T> = T & { distanceKm: number };

/** Nearest first (stable for equal distances). */
export function sortByDistance<T extends LatLng>(items: readonly T[], from: LatLng): WithDistance<T>[] {
  return items
    .map((it, i) => ({ it: { ...it, distanceKm: haversineKm(from, it) }, i }))
    .sort((a, b) => a.it.distanceKm - b.it.distanceKm || a.i - b.i)
    .map((x) => x.it);
}

export interface NearbyResult<T> {
  items: WithDistance<T>[];
  /** Radius step that produced results; null = whole country. */
  radiusKm: number | null;
  /** True when the first step was empty and the search had to widen. */
  expanded: boolean;
}

/**
 * Asks `fetchBox` for successively larger boxes around `center` and returns the
 * first non-empty step (items within the circle, nearest first). Falls back to
 * the whole country; an empty country yields `{ items: [], radiusKm: null }`.
 */
export async function findNearest<T extends LatLng>(
  center: LatLng,
  fetchBox: (box: BBox) => Promise<T[]>,
  radii: readonly number[] = NEARBY_RADII_KM,
): Promise<NearbyResult<T>> {
  for (const [i, km] of radii.entries()) {
    const found = sortByDistance(await fetchBox(bboxAround(center, km)), center).filter((x) => x.distanceKm <= km);
    if (found.length) return { items: found, radiusKm: km, expanded: i > 0 };
  }
  const all = sortByDistance(await fetchBox(KG_BBOX), center);
  return { items: all, radiusKm: null, expanded: radii.length > 0 && all.length > 0 };
}

/** «1,2 км» / «850 м» — distance label in the UI language's number format. */
export function formatDistance(km: number, units: { km: string; m: string }): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} ${units.m}`;
  const v = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `${v.toLocaleString("ru-RU")} ${units.km}`;
}
