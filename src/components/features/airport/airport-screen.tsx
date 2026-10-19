"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Plane, Plus, Search } from "lucide-react";
import { searchTrips, type TripCardItem } from "@/lib/api/trips";
import { listPassengerRequests, type PassengerRequestCardItem } from "@/lib/api/passenger-requests";
import { airportTitle, groupByTarget } from "@/lib/airport";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { TripCard } from "@/components/ui/trip-card";
import { RequestCard } from "@/components/features/passenger-requests/request-card";
import { CardSkeletonList } from "@/components/ui/card-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/ui/query-error";
import { RouteResultsMap } from "@/components/features/map/route-results-map";
import { ResultsViewToggle, type ResultsView } from "@/components/features/map/results-view";
import { originOf, requestPins, tripPins } from "@/components/features/map/result-pins";
import { useAuth } from "@/store/auth";
import { AirportWizard, FLIGHT_RE } from "./airport-wizard";
import { EMPTY_PLAN, planCreateQs, planReady, planRoute, planTime, useAirports, type AirportPlan } from "./airport-plan";

interface AirportSearch {
  fromId: number;
  toId: number;
  target: string;
  createQs: string;
  airport: { lat: number; lng: number; label: string } | null;
}

// Airport transfers by flight time: 3 steps + flight → «Найти трансфер» →
// drivers / passengers of that day, the ones within ±2h of the pickup first.
export function AirportScreen() {
  const t = useTranslations("airport");
  const locale = useLocale();
  const mode = useAuth((s) => s.activeMode);
  const airportsQuery = useAirports();
  const airports = useMemo(() => airportsQuery.data ?? [], [airportsQuery.data]);
  const [plan, setPlan] = useState<AirportPlan>(EMPTY_PLAN);
  const airport = airports.find((a) => a.id === plan.airportId) ?? null;
  const flightInvalid = plan.flightNumber.trim() !== "" && !FLIGHT_RE.test(plan.flightNumber.trim().toUpperCase());
  const ready = planReady(plan, airport) && !flightInvalid;
  const [search, setSearch] = useState<AirportSearch | null>(null);

  const onSearch = () => {
    const route = planRoute(plan, airport);
    if (!route || !airport) return;
    setSearch({
      fromId: route.from.id!,
      toId: route.to.id!,
      target: planTime(plan),
      createQs: planCreateQs(plan, airport),
      airport:
        airport.lat != null && airport.lng != null
          ? { lat: airport.lat, lng: airport.lng, label: airportTitle(airport, locale) }
          : null,
    });
  };

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-10 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
          <Plane className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-[22px] font-900 text-ink-900 dark:text-white">{t("title")}</h1>
          <p className="text-[13.5px] font-700 text-ink-500">{t("subtitle")}</p>
        </div>
      </div>

      {airportsQuery.isError ? (
        <QueryError error={airportsQuery.error} onRetry={() => void airportsQuery.refetch()} />
      ) : airportsQuery.isLoading ? (
        <CardSkeletonList variant="trip" count={2} />
      ) : (
        <>
          <AirportWizard airports={airports} plan={plan} setPlan={setPlan} />
          <Button variant="cta" size="lg" className="mt-4 w-full" disabled={!ready} onClick={onSearch}>
            <Search className="h-5 w-5" aria-hidden="true" />
            {t("find")}
          </Button>
        </>
      )}

      {search && <AirportResults key={JSON.stringify(search)} search={search} driver={mode === "driver"} />}
    </div>
  );
}

function AirportResults({ search, driver }: { search: AirportSearch; driver: boolean }) {
  const t = useTranslations("airport");
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<"trips" | "requests">(driver ? "requests" : "trips");
  const [view, setView] = useState<ResultsView>("list");
  const base = { from_id: search.fromId, to_id: search.toId, kind: "airport" as const, target_time: search.target, limit: 20 };

  const trips = useInfiniteQuery({
    queryKey: ["airport-trips", base],
    queryFn: ({ pageParam }) => searchTrips({ ...base, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: tab === "trips",
    staleTime: 30_000,
  });
  const requests = useInfiniteQuery({
    queryKey: ["airport-requests", base],
    queryFn: ({ pageParam }) => listPassengerRequests({ ...base, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: tab === "requests",
    staleTime: 30_000,
  });
  const list = tab === "trips" ? trips : requests;
  const tripRows: TripCardItem[] = trips.data?.pages.flatMap((p) => p.data) ?? [];
  const requestRows: PassengerRequestCardItem[] = requests.data?.pages.flatMap((p) => p.data) ?? [];
  const rows = tab === "trips" ? tripRows : requestRows;
  const pins = useMemo(
    () => (view !== "map" ? [] : tab === "trips" ? tripPins(tripRows, locale) : requestPins(requestRows, locale)),
    [view, tab, trips.data, requests.data, locale], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const renderGroup = (items: Array<TripCardItem | PassengerRequestCardItem>) =>
    tab === "trips"
      ? (items as TripCardItem[]).map((trip) => <TripCard key={trip.id} trip={trip} href={`/trips/${trip.id}`} />)
      : (items as PassengerRequestCardItem[]).map((r) => <RequestCard key={r.id} request={r} href={`/requests/${r.id}`} />);
  const { near, rest } = groupByTarget<TripCardItem | PassengerRequestCardItem>(rows);
  const groupTitle = "px-1 pt-1 text-[13px] font-900 uppercase tracking-wide text-ink-500";

  return (
    <section className="mt-6" aria-label={t("results_aria")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Chip kind="filter" selected={tab === "trips"} onClick={() => setTab("trips")}>
            {t("tab_drivers")}
          </Chip>
          <Chip kind="filter" selected={tab === "requests"} onClick={() => setTab("requests")}>
            {t("tab_passengers")}
          </Chip>
        </div>
        {rows.length > 0 && <ResultsViewToggle view={view} onChange={setView} />}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5">
        {list.isLoading ? (
          <CardSkeletonList variant={tab === "trips" ? "trip" : "request"} />
        ) : list.isError ? (
          <QueryError error={list.error} onRetry={() => void list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="route"
            iconTone="brand"
            title={tab === "trips" ? t("empty_trips") : t("empty_requests")}
            description={t("empty_desc")}
            className="bg-white shadow-card ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800"
          />
        ) : view === "map" ? (
          <RouteResultsMap
            kind={tab}
            query={{ kind: tab, from_id: search.fromId, to_id: search.toId, ride: "airport", target_time: search.target }}
            pins={pins}
            origin={originOf(rows)}
            fitKey={`${tab}|${search.target}|${search.fromId}|${search.toId}`}
            hasMore={Boolean(list.hasNextPage)}
            loadingMore={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
            onOpen={(id) => router.push(tab === "trips" ? `/trips/${id}` : `/requests/${id}`)}
            landmark={search.airport ?? undefined}
          />
        ) : (
          <>
            {near.length > 0 && <h3 className={groupTitle}>{t("group_near")}</h3>}
            {renderGroup(near)}
            {rest.length > 0 && <h3 className={groupTitle}>{t("group_rest")}</h3>}
            {renderGroup(rest)}
            {list.hasNextPage && (
              <Button variant="outline" size="lg" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                {list.isFetchingNextPage ? t("loading") : t("load_more")}
              </Button>
            )}
          </>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Link
          href={`/trips/create?${search.createQs}`}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink-900 px-3 py-3 text-center text-[14px] font-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" /> {t("publish_transfer")}
        </Link>
        <Link
          href={`/requests/create?${search.createQs}`}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink-900 px-3 py-3 text-center text-[14px] font-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" /> {t("need_transfer")}
        </Link>
      </div>
    </section>
  );
}
