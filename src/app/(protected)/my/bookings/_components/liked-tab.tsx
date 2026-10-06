"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { useLikedTrips, useLikedRequests } from "@/lib/hooks/use-likes";
import { useInfiniteScroll } from "@/lib/hooks/use-infinite-scroll";
import { Chip } from "@/components/ui/chip";
import { CardSkeletonList } from "@/components/ui/card-skeleton";
import { QueryError } from "@/components/ui/query-error";
import { DriverAvatar } from "@/components/ui";
import { ListCard } from "@/components/ui/list-card";
import type { TripListItem } from "@/lib/api/trips";
import type { PassengerRequest } from "@/lib/api/passenger-requests";

function fmtDT(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) +
    " · " +
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  );
}
function fmtD(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) : "";
}

// «Избранное» tab — design-spec §2.5. Driver likes passenger requests,
// passenger likes trips. Filter chips are a visual sort over the loaded list.

type FilterKey = "all" | "soon" | "cheap";

function EmptyLiked() {
  const t = useTranslations("my");
  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-8 text-center dark:border-ink-800 dark:bg-ink-900">
      <Heart className="mx-auto mb-2 h-8 w-8 text-coral-300" aria-hidden="true" />
      <p className="text-[16px] font-900 text-ink-900 dark:text-white">{t("liked_empty_title")}</p>
      <p className="mt-1 text-[15px] font-700 text-ink-500 dark:text-ink-400">{t("liked_empty_hint")}</p>
    </div>
  );
}

function FilterChips({ value, onChange }: { value: FilterKey; onChange: (v: FilterKey) => void }) {
  const t = useTranslations("my");
  const opts: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("filter_all") },
    { key: "soon", label: t("filter_soon") },
    { key: "cheap", label: t("filter_cheap") },
  ];
  return (
    <div className="mb-2.5 flex gap-1.5 overflow-x-auto">
      {opts.map((o) => (
        <Chip key={o.key} kind="filter" accent="accent" selected={value === o.key} onClick={() => onChange(o.key)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

// Phase 1: one favourites feed for everyone — liked trips AND liked requests
// together, each with its status badge; tap opens the item's page.
export function LikedTab() {
  const tB = useTranslations("bookings");
  const tSeats = useTranslations("booking_card");
  const [filter, setFilter] = useState<FilterKey>("all");

  const trips = useLikedTrips();
  const requests = useLikedRequests();

  // Both feeds are shown merged, so the single sentinel must page BOTH — wiring
  // it only to `trips` left liked requests stuck on their first page.
  const sentinel = useInfiniteScroll({
    hasNextPage: Boolean(trips.hasNextPage || requests.hasNextPage),
    isFetchingNextPage: trips.isFetchingNextPage || requests.isFetchingNextPage,
    fetchNextPage: () => {
      if (trips.hasNextPage) void trips.fetchNextPage();
      if (requests.hasNextPage) void requests.fetchNextPage();
    },
  });

  const tripItems = useMemo(() => trips.data?.pages.flatMap((p) => p.data) ?? [], [trips.data]);
  const requestItems = useMemo(() => requests.data?.pages.flatMap((p) => p.data) ?? [], [requests.data]);

  const sortedTrips = useMemo(() => {
    const arr = [...tripItems];
    if (filter === "soon") arr.sort((a, b) => new Date(a.departureAt ?? 0).getTime() - new Date(b.departureAt ?? 0).getTime());
    if (filter === "cheap") arr.sort((a, b) => (a.pricePerSeat ?? 0) - (b.pricePerSeat ?? 0));
    return arr;
  }, [tripItems, filter]);

  const sortedRequests = useMemo(() => {
    const arr = [...requestItems];
    if (filter === "soon") arr.sort((a, b) => new Date(a.departureDate ?? 0).getTime() - new Date(b.departureDate ?? 0).getTime());
    return arr;
  }, [requestItems, filter]);

  if (trips.isLoading || requests.isLoading) {
    return <CardSkeletonList variant="trip" count={3} />;
  }

  if (trips.isError || requests.isError) {
    const errored = trips.isError ? trips : requests;
    return (
      <QueryError
        error={errored.error}
        onRetry={() => { void trips.refetch(); void requests.refetch(); }}
      />
    );
  }

  const count = sortedTrips.length + sortedRequests.length;
  if (count === 0) return <EmptyLiked />;

  const now = Date.now();
  // Hide expired favourites (parity with Flutter): only live-and-upcoming shown.
  const liveTrips = sortedTrips.filter(
    (tr: TripListItem) => tr.status === "active" && new Date(tr.departureAt ?? 0).getTime() >= now,
  );
  const liveRequests = sortedRequests.filter(
    (r: PassengerRequest) => r.status === "open" && new Date(r.departureDate ?? 0).getTime() >= now,
  );
  if (liveTrips.length + liveRequests.length === 0) return <EmptyLiked />;

  return (
    <div className="flex flex-col">
      <FilterChips value={filter} onChange={setFilter} />
      <div className="flex flex-col gap-3.5">
        {[
          ...liveTrips.map((tr: TripListItem) => {
            return {
              key: `t-${tr.id}`,
              d: new Date(tr.departureAt ?? 0).getTime(),
              price: tr.pricePerSeat ?? Number.POSITIVE_INFINITY,
              node: (
                <ListCard
                  key={`t-${tr.id}`}
                  when={fmtDT(tr.departureAt)}
                  status={tr.status}
                  origin={tr.originCity ?? ""}
                  destination={tr.destinationCity ?? ""}
                  avatar={<DriverAvatar name={tr.driver?.name ?? ""} src={tr.driver?.avatarUrl} size="md" />}
                  actorName={tr.driver?.name}
                  trailing={<span className="num text-[15px] font-900 text-sky-600">{tr.pricePerSeat} {tB("som")}</span>}
                  href={`/trips/${tr.id}`}
                />
              ),
            };
          }),
          ...liveRequests.map((r: PassengerRequest) => {
            return {
              key: `r-${r.id}`,
              d: new Date(r.departureDate ?? 0).getTime(),
              // Requests carry no price — they sort last under «Дешевле».
              price: Number.POSITIVE_INFINITY,
              node: (
                <ListCard
                  key={`r-${r.id}`}
                  grape
                  when={fmtD(r.departureDate)}
                  status={r.status}
                  origin={r.originCity ?? ""}
                  destination={r.destinationCity ?? ""}
                  avatar={<DriverAvatar name={r.passenger?.name ?? ""} src={r.passenger?.avatarUrl} shape="square" size="md" />}
                  actorName={r.passenger?.name}
                  trailing={<span className="text-[12px] font-700 text-ink-500">{r.seatsNeeded} {tSeats("seats_word")}</span>}
                  href={`/requests/${r.id}`}
                />
              ),
            };
          }),
        ]
          // «Дешевле» → by price; otherwise (incl. «Скоро») by soonest departure.
          .sort((a, b) => (filter === "cheap" ? a.price - b.price : a.d - b.d))
          .map((x) => x.node)}
        {(trips.isFetchingNextPage || requests.isFetchingNextPage) && (
          <CardSkeletonList variant="trip" count={2} className="mt-0.5" />
        )}
      </div>
      <div ref={sentinel} aria-hidden="true" />
    </div>
  );
}
