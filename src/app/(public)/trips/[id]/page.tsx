import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n.config";
import { getTrip, type TripDetail } from "@/lib/api/trips";
import { extractError } from "@/lib/api/client";
import { formatDepartureLabel, formatPrice } from "@/lib/utils/date";
import { absoluteUrl, hreflangAlternates, ogLocales } from "@/lib/seo/site";
import { buildTripJsonLd } from "@/lib/seo/trip-jsonld";
import { TripDetailView, type DetailTripData } from "@/components/features/trip/trip-detail";

export const revalidate = 60;

interface Props {
  params: { id: string };
  searchParams: { book?: string; seats?: string };
}

// Deduped across generateMetadata + the page render within one request.
const fetchTrip = cache(async (id: string): Promise<TripDetail | null> => {
  try {
    return await getTrip(id);
  } catch (e) {
    const err = extractError(e);
    if (err.code === "NOT_FOUND" || err.code === "VALIDATION_ERROR") return null;
    // Outage / 5xx: surface the error boundary instead of a (cached) 404.
    throw e;
  }
});

// Cancelled → gone: 404, don't keep it in the index. Completed or past-departure
// ("expired") → still viewable but must be noindex so finished rides don't pile
// up as thin indexable pages.
function tripSeoState(trip: TripDetail): { cancelled: boolean; noindex: boolean } {
  const cancelled = trip.status === "cancelled";
  const past = trip.departureAt ? new Date(trip.departureAt).getTime() < Date.now() : false;
  const noindex = cancelled || trip.status === "completed" || past;
  return { cancelled, noindex };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const trip = await fetchTrip(params.id);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("trips_meta");
  if (!trip) return { title: t("not_found"), robots: { index: false } };

  const { cancelled, noindex } = tripSeoState(trip);
  if (cancelled) return { title: t("not_found"), robots: { index: false } };

  const dateLabel = trip.departureAt ? formatDepartureLabel(trip.departureAt, locale) : "";
  const title = dateLabel
    ? `${trip.originCity} → ${trip.destinationCity}, ${dateLabel}`
    : `${trip.originCity} → ${trip.destinationCity}`;
  const desc = t("detail_desc", {
    from: trip.originCity,
    to: trip.destinationCity,
    seats: trip.seatsAvailable ?? 0,
    price: formatPrice(trip.pricePerSeat ?? 0),
    hasDriver: trip.driver?.name ? "yes" : "no",
    driver: trip.driver?.name ?? "",
  });
  const path = `/trips/${params.id}`;
  const url = absoluteUrl(path);

  return {
    title,
    description: desc,
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
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

export default async function TripDetailsPage({ params, searchParams }: Props) {
  const trip = await fetchTrip(params.id);
  if (!trip || tripSeoState(trip).cancelled) notFound();

  const jsonLd = buildTripJsonLd(trip, absoluteUrl(`/trips/${params.id}`));

  return (
    <>
      {/* JSON-LD structured data — safe: JSON.stringify of API values, no user HTML.
          eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TripDetailView
        trip={trip as DetailTripData}
        variant="page"
        autoOpenBook={searchParams.book === "1"}
        initialSeats={Math.min(Math.max(Number(searchParams.seats) || 1, 1), 8)}
      />
    </>
  );
}
