import type { RoutePlace } from "@/lib/places";

// Last searched routes (max 3), most-recent first — shown on the search entry
// so the user can re-run a search in one tap. localStorage-backed; safe in
// private mode (all access is try/caught). Entries carry place ids.
const KEY = "terme_recent_routes_v2";
const MAX = 3;

export interface RecentRoute {
  from: RoutePlace;
  to: RoutePlace;
}

const isPlace = (p: unknown): p is RoutePlace =>
  !!p && typeof (p as RoutePlace).nameRu === "string" && typeof (p as RoutePlace).nameKg === "string";

export function getRecentRoutes(): RecentRoute[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((r): r is RecentRoute => !!r && isPlace(r.from) && isPlace(r.to)).slice(0, MAX);
  } catch {
    return [];
  }
}

const same = (a: RoutePlace, b: RoutePlace) => (a.id ?? a.nameRu) === (b.id ?? b.nameRu);

export function addRecentRoute(from: RoutePlace, to: RoutePlace): void {
  try {
    const prev = getRecentRoutes().filter((r) => !(same(r.from, from) && same(r.to, to)));
    localStorage.setItem(KEY, JSON.stringify([{ from, to }, ...prev].slice(0, MAX)));
  } catch {
    /* quota / private mode */
  }
}

export function clearRecentRoutes(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

// The route the hub search card reopens with.
const LAST_KEY = "terme_last_route_v2";

export function readLastRoute(): RecentRoute | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<RecentRoute>;
    return isPlace(v.from) && isPlace(v.to) ? { from: v.from, to: v.to } : null;
  } catch {
    return null;
  }
}

export function saveLastRoute(from: RoutePlace, to: RoutePlace): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ from, to }));
  } catch {
    /* ignore */
  }
}
