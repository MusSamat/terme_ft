import type { Airport } from "@/lib/api/cities";
import { placeName, type RoutePlace } from "@/lib/places";
import type { Locale } from "@/i18n.config";

// Airport transfers: flight time ↔ listing time, all in Kyrgyzstan wall-clock
// (fixed UTC+6, no DST) whatever the device zone.

const KG_OFFSET_MS = 6 * 3_600_000;

/** «2026-10-20» + «05:40» → the KG instant as ISO with +06:00. */
export function kgIso(date: string, time: string): string {
  return `${date}T${time}:00+06:00`;
}

/** An instant → its KG calendar day and «HH:MM». */
export function splitKg(iso: string): { date: string; time: string } {
  const kg = new Date(new Date(iso).getTime() + KG_OFFSET_MS).toISOString();
  return { date: kg.slice(0, 10), time: kg.slice(11, 16) };
}

/**
 * When the listing starts: to the airport = the pickup (suggested or edited,
 * may fall on the previous day for an early flight); from it = the arrival.
 */
export function listingTime(plan: {
  toAirport: boolean;
  flightDate: string;
  flightTime: string;
  pickup: { date: string; time: string } | null;
}): string {
  if (plan.toAirport && plan.pickup) return kgIso(plan.pickup.date, plan.pickup.time);
  return kgIso(plan.flightDate, plan.flightTime);
}

/** Airport card / chip title in the UI language («Манас · Бишкек»). */
export function airportTitle(a: Pick<Airport, "titleRu" | "titleKg">, locale: Locale | string): string {
  return locale === "kg" ? a.titleKg || a.titleRu : a.titleRu;
}

/**
 * A destination chip whose name reads like an airport («Манас» — the city of
 * Жалал-Абад in the directory) needs its raion / oblast line under it.
 */
export function collidesWithAirport(
  p: Pick<RoutePlace, "nameRu" | "nameKg">,
  airports: Array<Pick<Airport, "titleRu" | "titleKg" | "nameRu" | "nameKg">>,
  locale: Locale | string,
): boolean {
  const name = placeName(p, locale).trim().toLowerCase();
  return airports.some((a) =>
    [airportTitle(a, locale), placeName(a, locale)].some((t) => {
      const title = t.trim().toLowerCase();
      return title === name || title.split(/\s*·\s*|\s+/).includes(name);
    }),
  );
}

/** Results of a target_time search: within ±2h first, then the rest of the day. */
export function groupByTarget<T extends { nearTarget?: boolean }>(items: T[]): { near: T[]; rest: T[] } {
  const near: T[] = [];
  const rest: T[] = [];
  for (const it of items) (it.nearTarget ? near : rest).push(it);
  return { near, rest };
}
