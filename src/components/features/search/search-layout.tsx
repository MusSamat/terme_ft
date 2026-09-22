"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { searchTrips, getTrip, type SearchTripsParams, type TripSearchResult, type TripCardItem } from "@/lib/api/trips";
import { buildTripSearchParams } from "@/lib/trip-search-params";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";
import { TripCard } from "@/components/ui/trip-card";
import { EmptyState } from "@/components/ui/empty-state";
import { NextDayCta } from "@/components/features/search/next-day-cta";
import { CardSkeletonList } from "@/components/ui/card-skeleton";
import { QueryError } from "@/components/ui/query-error";
import { BackToTop } from "@/components/ui/back-to-top";
import { PullToRefresh } from "@/components/ui";
import { useInfiniteScroll } from "@/lib/hooks/use-infinite-scroll";
import { useScrollRestoration } from "@/lib/hooks/use-scroll-restoration";
import { useUiRole } from "@/lib/hooks/use-role-colors";
import { useAuth } from "@/store/auth";
import { listMyBookings } from "@/lib/api/bookings";

import { SearchFilters } from "./search-filters";
import { TripDetailView, type DetailTripData } from "@/components/features/trip/trip-detail";
import { PopularRoutes } from "./popular-routes";
import { FeedHeader } from "./feed-header";
import { FeedEntryHints } from "./feed-entry-hints";
import { addRecentRoute } from "@/lib/recent-routes";
import { BecomeDriverBanner } from "@/components/features/driver/become-driver-banner";

interface Props {
  /** SSR-seeded first page (from /trips). Omitted on the unified home `/`,
   *  where results are fetched client-side. */
  initial?: TripSearchResult;
}

const EMPTY_RESULT: TripSearchResult = { data: [], nextCursor: null };

/** Role-aware feed empty state (spec §2.2 recommends one; copy in feed.empty_*). */
function FeedEmpty({ params }: { params: SearchTripsParams }) {
  const t = useTranslations("feed");
  const role = useUiRole();

  const requestQs = `${params.from_city ? `?from=${encodeURIComponent(params.from_city)}` : ""}${
    params.to_city ? `${params.from_city ? "&" : "?"}to=${encodeURIComponent(params.to_city)}` : ""
  }`;

  const action =
    role === "guest"
      ? { label: t("empty_cta_login"), href: "/auth/login" }
      : role === "driver"
        ? { label: t("empty_trips_cta_driver"), href: "/trips/create" }
        : { label: t("empty_trips_cta"), href: `/requests/create${requestQs}` };

  return (
    <div className="flex flex-col gap-5">
      <EmptyState
        icon="route"
        iconTone="brand"
        title={t("empty_trips_title")}
        description={role === "guest" ? t("empty_trips_desc_guest") : t("empty_trips_desc")}
        action={action}
        className="bg-white shadow-card ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800"
      />
      {/* No rides today on this route → jump to the next day that has some. */}
      <NextDayCta kind="trips" />
      <PopularRoutes />
    </div>
  );
}

// Memoized row so a selection/filter re-render only re-renders the two cards
// whose `active` actually changed (TripCard itself is memo'd; onSelect is
// stable from the parent).
const FeedTripRow = memo(function FeedTripRow({
  trip,
  index,
  active,
  booked,
  onSelect,
}: {
  trip: TripCardItem;
  index: number;
  active: boolean;
  booked: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="animate-card-in" style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}>
      <TripCard
        trip={trip}
        active={active}
        onClick={() => onSelect(trip.id ?? "")}
        booked={booked}
      />
    </div>
  );
});

export function SearchLayout({ initial }: Props) {
  const t = useTranslations("feed");
  // Filters live in the URL. Reading them CLIENT-side (not via a server prop)
  // means a filter change refetches here instantly — no blocking SSR round-trip
  // (the old freeze). The filter controls wrap their router.replace in a
  // transition so the URL/params update optimistically; see search-filters.tsx.
  const searchParams = useSearchParams();
  const params = useMemo<SearchTripsParams>(
    () => buildTripSearchParams((k) => searchParams.get(k)),
    [searchParams],
  );
  // Route-first: only fetch/show results once both cities are set.
  const hasRoute = Boolean(params.from_city && params.to_city);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError, error, refetch, isPlaceholderData, isFetching } = useInfiniteQuery({
    queryKey: ["trips", params],
    queryFn: ({ pageParam }) => searchTrips({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: hasRoute,
    // keepPreviousData behaviour (no list flash/collapse when params change),
    // falling back to the SSR-seeded first page on the very first mount.
    placeholderData: (prev) =>
      prev ?? { pages: [initial ?? EMPTY_RESULT], pageParams: [undefined as string | undefined] },
    staleTime: 0,
  });

  const trips = data?.pages.flatMap((p) => p.data) ?? [];
  // Showing the previous page's cards while the new filter's results load —
  // dim them so the change is felt instantly instead of looking frozen.
  const filtering = isPlaceholderData && isFetching;

  // Which of these trips the viewer already booked — one query, so cards show a
  // «Забронировано» badge and the user isn't confused about which they've sent.
  const authed = useAuth((s) => s.status === "authenticated");
  const { data: myBookings } = useQuery({
    queryKey: ["bookings", "my", "outgoing"],
    queryFn: () => listMyBookings(),
    enabled: authed,
    staleTime: 30_000,
  });
  const bookedTripIds = new Set(
    (myBookings?.data ?? [])
      .filter((b) => ["pending", "viewed", "accepted"].includes(b.status as string))
      .map((b) => (b as { tripId?: string }).tripId)
      .filter(Boolean) as string[],
  );
  const selectedTrip: TripCardItem | null = trips.find((t) => t.id === selectedId) ?? trips[0] ?? null;

  // Full detail is fetched by id when the sheet opens (the card already
  // prefetched ["trip", id], so this is instant). The list item is the
  // placeholder meanwhile — this lets the list payload stay lean while the
  // detail always has the complete info.
  const { data: detailTrip } = useQuery({
    queryKey: ["trip", selectedId],
    queryFn: () => getTrip(selectedId as string),
    enabled: mobileDetailOpen && Boolean(selectedId),
    staleTime: 60_000,
    placeholderData: () => (selectedTrip ?? undefined) as never,
  });

  useEffect(() => {
    if (trips.length && !selectedId) setSelectedId(trips[0]?.id ?? null);
  }, [trips.length]);

  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen || mobileDetailOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileFiltersOpen, mobileDetailOpen]);

  const sentinel = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });
  useScrollRestoration();

  // Card tap → open the detail sheet (same on all widths now).
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileDetailOpen(true);
  }, []);

  const nearby = data?.pages[0]?.nearby === true;

  // Pick a route from the entry hints — updates the URL on THIS page (no
  // navigation), so only the body swaps to results (header stays put).
  const router = useRouter();
  const pathname = usePathname();
  const pickRoute = (f: string, tt: string) => {
    addRecentRoute(f, tt);
    const next = new URLSearchParams(searchParams);
    next.set("from", f);
    next.set("to", tt);
    next.delete("cursor");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <BackToTop showOnDesktop />

      {/* ONE structure for all widths (spec: same concept, responsive build):
          header on top → results as a card grid (1 col mobile, 2 cols ≥md) →
          filters & detail open as centered bottom sheets. */}
      <div className="mx-auto w-full max-w-[900px]">
        <FeedHeader tab="trips" onOpenFilters={() => setMobileFiltersOpen(true)} />

        <div className="px-4 pb-6">
          <BecomeDriverBanner />
          {!hasRoute ? (
            <FeedEntryHints onPick={pickRoute} tab="trips" />
          ) : isFetching && trips.length === 0 ? (
            <CardSkeletonList variant="trip" />
          ) : trips.length === 0 ? (
            isError ? (
              <QueryError error={error} onRetry={() => void refetch()} />
            ) : (
              <FeedEmpty params={params} />
            )
          ) : (
            <>
              {nearby && (
                <div className="mb-2.5 rounded-2xl bg-accent-50 px-4 py-2.5 text-[14px] font-700 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
                  {t("nearby_notice")}
                </div>
              )}
              <div className={cn("grid grid-cols-1 gap-2.5 md:grid-cols-2", filtering && "opacity-50 transition-opacity duration-150")}>
                {trips.map((trip, i) => (
                  <FeedTripRow
                    key={trip.id}
                    trip={trip}
                    index={i}
                    active={false}
                    booked={bookedTripIds.has(trip.id ?? "")}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
              {isFetchingNextPage && <CardSkeletonList variant="trip" count={2} className="mt-2.5" />}
              <div ref={sentinel} className="flex h-8 items-center justify-center">
                {!hasNextPage && trips.length > 0 && (
                  <span className="text-[13px] font-800 text-ink-400">{t("no_more_trips")}</span>
                )}
              </div>
              {/* List ended → offer the next day that has rides. */}
              {!hasNextPage && <NextDayCta kind="trips" />}
            </>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {(mobileFiltersOpen || mobileDetailOpen) && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => { setMobileFiltersOpen(false); setMobileDetailOpen(false); }}
        />
      )}

      {/* Filters sheet — full-width on mobile, centered + width-capped on desktop */}
      <div
        className={`search-sheet sheet-nav-pad fixed bottom-0 left-0 right-0 z-40 mx-auto max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-t-4xl bg-white dark:bg-ink-900${mobileFiltersOpen ? " open" : ""}`}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
          <h2 className="text-[17px] font-900 text-ink-900 dark:text-white">{t("filters")}</h2>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-500 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-6">
          <SearchFilters />
        </div>
        <div className="border-t border-ink-100 px-5 py-4 dark:border-ink-800">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="h-12 w-full rounded-2xl bg-accent-500 text-[16px] font-900 text-accent-ink shadow-cta transition-colors hover:bg-accent-400"
          >
            {t("show_trips", { n: trips.length })}
          </button>
        </div>
      </div>

      {/* Detail sheet */}
      <div
        className={`search-sheet sheet-nav-pad fixed bottom-0 left-0 right-0 z-40 mx-auto max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-t-4xl bg-white dark:bg-ink-900${mobileDetailOpen ? " open" : ""}`}
      >
        <div className="pb-5">
          {(detailTrip || selectedTrip) && (
            <TripDetailView
              trip={(detailTrip ?? selectedTrip) as DetailTripData}
              variant="rail"
              onClose={() => setMobileDetailOpen(false)}
            />
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}
