import type { Metadata } from "next";
import type { Locale } from "@/i18n.config";

/** Canonical origin for every absolute SEO URL (sitemap, canonical, OG, JSON-LD). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://terme.kg";

/** Turn a path (or already-absolute URL) into an absolute canonical URL. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// hreflang note: this app resolves the UI language from a cookie, so `ru` and
// `kg` render at the *same* URL. True per-URL hreflang (distinct localized URLs)
// is therefore impossible — advertising `/x?lang=ru` vs `/x?lang=kg` would be a
// lie. The honest signal is a single `x-default` on the shared canonical plus
// og:locale / og:locale:alternate to say "this page exists in two languages".
export function hreflangAlternates(
  path: string,
): NonNullable<Metadata["alternates"]>["languages"] {
  return { "x-default": absoluteUrl(path) };
}

const OG_LOCALE: Record<Locale, string> = { ru: "ru_RU", kg: "ky_KG" };

/** og:locale for the active language + og:locale:alternate for the other. */
export function ogLocales(locale: Locale): { locale: string; alternateLocale: string[] } {
  const other: Locale = locale === "ru" ? "kg" : "ru";
  return { locale: OG_LOCALE[locale], alternateLocale: [OG_LOCALE[other]] };
}
