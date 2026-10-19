import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Users } from "lucide-react";
import type { Locale } from "@/i18n.config";
import { searchTrips, type TripCardItem } from "@/lib/api/trips";
import { formatDepartureLabel, formatPrice } from "@/lib/utils/date";
import { routeNames } from "@/lib/places";
import {
  ROUTE_PAIRS,
  findRoutePair,
  relatedRoutePairs,
  type RouteCity,
  type RoutePair,
} from "@/lib/seo/routes";
import { absoluteUrl, hreflangAlternates, ogLocales } from "@/lib/seo/site";
import { Container } from "@/components/ui";

export const revalidate = 300;

interface Props {
  params: { pair: string };
}

export function generateStaticParams() {
  return ROUTE_PAIRS.map((p) => ({ pair: p.slug }));
}

function cityName(city: RouteCity, locale: Locale): string {
  return locale === "kg" ? city.nameKg : city.nameRu;
}

interface RouteStats {
  trips: TripCardItem[];
  count: number;
  minPrice: number | null;
}

// SEO shell must survive a flaky API — never throw, degrade to an empty list.
async function fetchRouteTrips(pair: RoutePair): Promise<RouteStats> {
  try {
    const { data } = await searchTrips({
      from_city: pair.from.nameRu,
      to_city: pair.to.nameRu,
      sort: "price_asc",
      limit: 20,
    });
    const prices = data
      .map((t) => t.pricePerSeat)
      .filter((p): p is number => typeof p === "number" && p > 0);
    return {
      trips: data,
      count: data.length,
      minPrice: prices.length ? Math.min(...prices) : null,
    };
  } catch {
    return { trips: [], count: 0, minPrice: null };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pair = findRoutePair(params.pair);
  if (!pair) return { title: "404", robots: { index: false } };

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("route_page");
  const from = cityName(pair.from, locale);
  const to = cityName(pair.to, locale);
  const { minPrice } = await fetchRouteTrips(pair);

  const hasPrice = minPrice != null ? "yes" : "no";
  const price = minPrice != null ? formatPrice(minPrice) : "";
  const title = t("meta_title", { from, to });
  const desc = t("meta_desc", { from, to, hasPrice, price });
  const path = `/route/${pair.slug}`;
  const url = absoluteUrl(path);

  return {
    title,
    description: desc,
    alternates: { canonical: url, languages: hreflangAlternates(path) },
    openGraph: {
      title,
      description: desc,
      type: "website",
      url,
      siteName: "Terme",
      ...ogLocales(locale),
    },
    twitter: { card: "summary", title, description: desc },
  };
}

function TripRow({ trip, locale }: { trip: TripCardItem; locale: Locale }) {
  return (
    <li>
      <Link
        href={`/trips/${trip.id}`}
        className="flex items-center justify-between gap-3 rounded-3xl border border-ink-100 bg-white p-4 shadow-card transition-colors hover:border-brand-200 dark:border-ink-800 dark:bg-ink-900"
      >
        <div className="min-w-0">
          <p className="truncate font-disp text-[16px] font-900 text-ink-900 dark:text-white">
            {routeNames(trip, locale).from} → {routeNames(trip, locale).to}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-500 dark:text-ink-400">
            {trip.departureAt ? formatDepartureLabel(trip.departureAt, locale) : ""}
            {typeof trip.seatsAvailable === "number" && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden="true" />
                {trip.seatsAvailable}
              </span>
            )}
          </p>
        </div>
        <span className="flex-shrink-0 font-disp text-[16px] font-900 text-brand-700 dark:text-brand-300">
          {typeof trip.pricePerSeat === "number" ? formatPrice(trip.pricePerSeat) : "—"}
        </span>
      </Link>
    </li>
  );
}

export default async function RouteLandingPage({ params }: Props) {
  const pair = findRoutePair(params.pair);
  if (!pair) notFound();

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("route_page");
  const from = cityName(pair.from, locale);
  const to = cityName(pair.to, locale);
  const { trips, count, minPrice } = await fetchRouteTrips(pair);
  const related = relatedRoutePairs(pair.slug, 4);

  const hasPrice = minPrice != null ? "yes" : "no";
  const price = minPrice != null ? formatPrice(minPrice) : "";

  const faq = [
    { q: t("faq.q_book", { from, to }), a: t("faq.a_book", { from, to }) },
    { q: t("faq.q_price", { from, to }), a: t("faq.a_price", { from, to, hasPrice, price }) },
    { q: t("faq.q_safety", { from, to }), a: t("faq.a_safety", { from, to }) },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "ItemList",
        name: `${from} → ${to}`,
        itemListElement: trips.slice(0, 20).map((trip, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: absoluteUrl(`/trips/${trip.id}`),
        })),
      },
    ],
  };

  return (
    <Container className="py-6 lg:py-10">
      {/* JSON-LD structured data — safe: JSON.stringify of API values, no user HTML. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-6">
        <h1 className="font-disp text-[26px] font-900 leading-tight text-ink-900 dark:text-white">
          {t("h1", { from, to })}
        </h1>
        <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-600 dark:text-ink-300">
          {t("intro", { from, to })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {count > 0 && (
            <span className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-[14px] font-700 text-ink-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200">
              {t("count", { count })}
            </span>
          )}
          {minPrice != null && (
            <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[13px] font-800 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300">
              {t("price_from", { price: formatPrice(minPrice) })}
            </span>
          )}
        </div>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 font-disp text-[20px] font-900 text-ink-900 dark:text-white">
          {t("trips_title", { from, to })}
        </h2>
        {trips.length === 0 ? (
          <div className="rounded-3xl border border-ink-100 bg-white p-8 text-center shadow-card dark:border-ink-800 dark:bg-ink-900">
            <p className="text-[15px] font-700 text-ink-500 dark:text-ink-400">{t("no_trips")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {trips.map((trip) => (
              <TripRow key={trip.id} trip={trip} locale={locale} />
            ))}
          </ul>
        )}
        <Link
          href={`/trips?from=${encodeURIComponent(pair.from.nameRu)}&to=${encodeURIComponent(pair.to.nameRu)}`}
          className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-800 text-brand-700 hover:underline dark:text-brand-300"
        >
          {t("view_all", { from, to })}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-disp text-[20px] font-900 text-ink-900 dark:text-white">
          {t("faq_title")}
        </h2>
        <ul className="flex flex-col gap-3">
          {faq.map((f) => (
            <li
              key={f.q}
              className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900"
            >
              <h3 className="text-[15px] font-800 text-ink-900 dark:text-white">{f.q}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600 dark:text-ink-300">
                {f.a}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-disp text-[20px] font-900 text-ink-900 dark:text-white">
          {t("related_title")}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {related.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/route/${p.slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[15px] font-700 text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
              >
                {cityName(p.from, locale)} → {cityName(p.to, locale)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
