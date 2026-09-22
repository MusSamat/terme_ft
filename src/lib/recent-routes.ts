// Last searched routes (max 3), most-recent first — shown on the search entry
// so the user can re-run a search in one tap. localStorage-backed; safe in
// private mode (all access is try/caught).
const KEY = "terme_recent_routes";
const MAX = 3;

export interface RecentRoute {
  from: string;
  to: string;
}

export function getRecentRoutes(): RecentRoute[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r): r is RecentRoute => !!r && typeof r.from === "string" && typeof r.to === "string")
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function addRecentRoute(from: string, to: string): void {
  const f = from.trim();
  const t = to.trim();
  if (!f || !t) return;
  try {
    const prev = getRecentRoutes().filter((r) => !(r.from === f && r.to === t));
    localStorage.setItem(KEY, JSON.stringify([{ from: f, to: t }, ...prev].slice(0, MAX)));
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
