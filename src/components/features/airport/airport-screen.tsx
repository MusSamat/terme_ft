"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownUp, Map as MapIcon, Plane, PlaneLanding, PlaneTakeoff, Plus } from "lucide-react";
import { getAirports, type Airport } from "@/lib/api/cities";
import { searchTrips } from "@/lib/api/trips";
import { listPassengerRequests } from "@/lib/api/passenger-requests";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { Chip } from "@/components/ui/chip";
import { TripCard } from "@/components/ui/trip-card";
import { RequestCard } from "@/components/features/passenger-requests/request-card";
import { CardSkeletonList } from "@/components/ui/card-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { placeName, setRouteParams, toRoutePlace, type RoutePlace } from "@/lib/places";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils/cn";

const ymdKg = (offset = 0) => new Date(Date.now() + 6 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);

// Airport transfers — a product of its own: city ↔ airport, several rides a
// day, flight numbers on requests. Lists drivers and passengers for the pair;
// the map shows where in the city each one starts.
export function AirportScreen() {
  const t = useTranslations("airport");
  const locale = useLocale();
  const mode = useAuth((s) => s.activeMode);

  const { data: airports = [] } = useQuery({ queryKey: ["airports"], queryFn: getAirports, staleTime: 60 * 60_000 });
  const [airportId, setAirportId] = useState<number | null>(null);
  const airport: Airport | null = airports.find((a) => a.id === airportId) ?? airports[0] ?? null;
  const [toAirport, setToAirport] = useState(true);
  const [city, setCity] = useState<RoutePlace | null>(null);
  const [date, setDate] = useState(ymdKg(0));
  const [tab, setTab] = useState<"trips" | "requests">(mode === "driver" ? "requests" : "trips");

  // The city defaults to the one the airport serves (Манас → Бишкек).
  useEffect(() => {
    if (airport?.serves) setCity(toRoutePlace(airport.serves));
  }, [airport?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const from = toAirport ? city : airport ? toRoutePlace(airport) : null;
  const to = toAirport ? (airport ? toRoutePlace(airport) : null) : city;
  const ready = Boolean(from?.id && to?.id);
  const dateIso = date ? `${date}T00:00:00+06:00` : undefined;

  const trips = useQuery({
    queryKey: ["airport-trips", from?.id, to?.id, dateIso],
    queryFn: () => searchTrips({ from_id: from!.id!, to_id: to!.id!, kind: "airport", date: dateIso, limit: 50 }),
    enabled: ready && tab === "trips",
    staleTime: 30_000,
  });
  const requests = useQuery({
    queryKey: ["airport-requests", from?.id, to?.id, dateIso],
    queryFn: () =>
      listPassengerRequests({ from_id: from!.id!, to_id: to!.id!, kind: "airport", date: dateIso, limit: 50 }),
    enabled: ready && tab === "requests",
    staleTime: 30_000,
  });

  const routeQs = useMemo(() => {
    const qs = new URLSearchParams();
    setRouteParams(qs, from, to);
    return qs.toString();
  }, [from, to]);
  const mapHref = useMemo(() => {
    const qs = new URLSearchParams({ ride: "airport", kind: tab });
    setRouteParams(qs, null, to);
    return `/map?${qs.toString()}`;
  }, [tab, to]);

  const list = tab === "trips" ? trips : requests;
  const rows = list.data?.data ?? [];

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-10 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
          <Plane className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-[22px] font-900 text-ink-900 dark:text-white">{t("title")}</h1>
          <p className="text-[13.5px] font-700 text-ink-500">{t("subtitle")}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-3xl bg-white p-4 shadow-card ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800">
        <div className="grid grid-cols-2 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800">
          {[true, false].map((dir) => (
            <button
              key={String(dir)}
              type="button"
              onClick={() => setToAirport(dir)}
              aria-pressed={toAirport === dir}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-xl text-[14px] font-900 transition-colors",
                toAirport === dir ? "bg-sky-600 text-white" : "text-ink-500 dark:text-ink-400",
              )}
            >
              {dir ? <PlaneTakeoff className="h-4 w-4" aria-hidden="true" /> : <PlaneLanding className="h-4 w-4" aria-hidden="true" />}
              {dir ? t("to_airport") : t("from_airport")}
            </button>
          ))}
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {airports.map((a) => (
            <Chip key={a.id} kind="filter" selected={airport?.id === a.id} onClick={() => setAirportId(a.id)}>
              ✈️ {placeName(a, locale).replace(/^Аэропорт\s*/, "")}
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-ink-50 p-1.5 pl-3 dark:bg-ink-800/60">
          <span className="shrink-0 text-[12px] font-800 uppercase tracking-wide text-ink-400">
            {toAirport ? t("from_city") : t("to_city")}
          </span>
          <CityAutocomplete
            borderless
            compact
            value={city}
            onChange={(v) => v && setCity(toRoutePlace(v))}
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => setToAirport((v) => !v)}
            aria-label={t("swap")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-ink-500 shadow-xs dark:bg-ink-900"
          >
            <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          <Chip kind="filter" selected={date === ymdKg(0)} onClick={() => setDate(ymdKg(0))}>{t("today")}</Chip>
          <Chip kind="filter" selected={date === ymdKg(1)} onClick={() => setDate(ymdKg(1))}>{t("tomorrow")}</Chip>
          <Chip kind="filter" selected={!date} onClick={() => setDate("")}>{t("any_day")}</Chip>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Link
          href={`/trips/create?${routeQs}`}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-brand-600 px-3 py-3 text-[14px] font-900 text-white hover:bg-brand-500"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> {t("publish_transfer")}
        </Link>
        <Link
          href={`/requests/create?${routeQs}`}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-grape-500 px-3 py-3 text-[14px] font-900 text-white hover:bg-grape-600"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> {t("need_transfer")}
        </Link>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Chip kind="filter" selected={tab === "trips"} onClick={() => setTab("trips")}>{t("tab_drivers")}</Chip>
          <Chip kind="filter" selected={tab === "requests"} onClick={() => setTab("requests")}>{t("tab_passengers")}</Chip>
        </div>
        <Link href={mapHref} className="flex items-center gap-1.5 text-[13.5px] font-800 text-brand-700 dark:text-brand-300">
          <MapIcon className="h-4 w-4" aria-hidden="true" /> {t("on_map")}
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5">
        {!ready ? null : list.isLoading ? (
          <CardSkeletonList variant={tab === "trips" ? "trip" : "request"} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="route"
            iconTone="brand"
            title={tab === "trips" ? t("empty_trips") : t("empty_requests")}
            description={t("empty_desc")}
            className="bg-white shadow-card ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800"
          />
        ) : tab === "trips" ? (
          trips.data!.data.map((trip) => <TripCard key={trip.id} trip={trip} href={`/trips/${trip.id}`} />)
        ) : (
          requests.data!.data.map((r) => <RequestCard key={r.id} request={r} href={`/requests/${r.id}`} />)
        )}
      </div>
    </div>
  );
}
