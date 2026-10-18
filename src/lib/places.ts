import type { Locale } from "@/i18n.config";
import type { Place } from "@/lib/api/cities";

type Named = { nameRu?: string; nameKg?: string };

/** A place / area name in the UI language. */
export function placeName(p: Named | null | undefined, locale: Locale | string): string {
  if (!p) return "";
  return (locale === "kg" ? p.nameKg || p.nameRu : p.nameRu) ?? "";
}

const OBLAST_SHORT: Record<string, [RegExp, string]> = {
  ru: [/ область$/, " обл."],
  kg: [/ облусу$/, " обл."],
};

/**
 * Picker subtitle, Yandex-style: «Ноокенский район, Жалал-Абадская обл.» for a
 * village, the oblast for a city / airport, nothing for Бишкек / Ош.
 */
export function placeSubtitle(p: Place, locale: Locale | string): string {
  if (p.type === "capital") return "";
  const [re, short] = OBLAST_SHORT[locale === "kg" ? "kg" : "ru"]!;
  const oblast = p.oblast ? placeName(p.oblast, locale).replace(re, short) : "";
  const raion = p.raion ? placeName(p.raion, locale) : "";
  return [raion, oblast].filter(Boolean).join(", ");
}

/** «Бишкек · Асанбай» — a settlement with the жилмассив of a pin. */
export function placeWithArea(
  p: Named | null | undefined,
  area: Named | null | undefined,
  locale: Locale | string,
): string {
  const name = placeName(p, locale);
  return area ? `${name} · ${placeName(area, locale)}` : name;
}

/** WhatsApp chat link for an E.164 phone (+996…). */
export function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

/** The bit of a place a route needs: id (null = legacy name-only URL) + names. */
export interface RoutePlace {
  id: number | null;
  nameRu: string;
  nameKg: string;
  /** Known when picked from the directory (centres the pin picker). */
  type?: Place["type"];
  lat?: number | null;
  lng?: number | null;
}

export function toRoutePlace(p: Pick<Place, "id" | "nameRu" | "nameKg"> & Partial<Place>): RoutePlace {
  return { id: p.id, nameRu: p.nameRu, nameKg: p.nameKg, type: p.type, lat: p.lat ?? null, lng: p.lng ?? null };
}

/**
 * Search URL for a route: ids drive the API (from_id / to_id), names keep the
 * link readable and shareable (and are the fallback for SEO / old links).
 */
export function setRouteParams(qs: URLSearchParams, from: RoutePlace | null, to: RoutePlace | null): void {
  for (const [key, p] of [["from", from], ["to", to]] as const) {
    qs.delete(key);
    qs.delete(`${key}_id`);
    qs.delete(`${key}_kg`);
    if (!p) continue;
    qs.set(key, p.nameRu);
    if (p.nameKg && p.nameKg !== p.nameRu) qs.set(`${key}_kg`, p.nameKg);
    if (p.id !== null) qs.set(`${key}_id`, String(p.id));
  }
}

export function routeFromParams(
  get: (k: string) => string | null,
): { from: RoutePlace | null; to: RoutePlace | null } {
  const read = (key: "from" | "to"): RoutePlace | null => {
    const name = get(key) ?? get(`${key}_city`);
    if (!name) return null;
    const id = Number(get(`${key}_id`));
    return { id: Number.isInteger(id) && id > 0 ? id : null, nameRu: name, nameKg: get(`${key}_kg`) ?? name };
  };
  return { from: read("from"), to: read("to") };
}

/** API filter for a route place: the id when known, else the name. */
export function placeFilter(
  key: "from" | "to",
  p: RoutePlace | null,
): Record<string, string | number> {
  if (!p) return {};
  return p.id !== null ? { [`${key}_id`]: p.id } : { [`${key}_city`]: p.nameRu };
}

type WithRoute = {
  originCity?: string | null;
  destinationCity?: string | null;
  origin?: Named | null;
  destination?: Named | null;
};

/** «from → to» names in the UI language (snapshot names when no place refs). */
export function routeNames(x: WithRoute | null | undefined, locale: Locale | string): { from: string; to: string } {
  if (!x) return { from: "", to: "" };
  return {
    from: x.origin ? placeName(x.origin, locale) : (x.originCity ?? ""),
    to: x.destination ? placeName(x.destination, locale) : (x.destinationCity ?? ""),
  };
}
