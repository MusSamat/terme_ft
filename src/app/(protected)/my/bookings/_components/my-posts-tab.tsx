"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { listMyTrips } from "@/lib/api/my-trips";
import { getDriverStatus } from "@/lib/api/profile";
import { listMyPassengerRequests, type PassengerRequest } from "@/lib/api/passenger-requests";
import type { TripListItem } from "@/lib/api/trips";
import { DriverAvatar } from "@/components/ui";
import { ListCard } from "@/components/ui/list-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeletonList } from "@/components/ui/card-skeleton";

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

// «Мои объявления» — trips AND ride requests in one feed (Phase 1: no roles).
// Cards keep their identity colors (teal trip / grape request), every card
// carries its text status badge, and tapping opens the OWN page: the trip page
// (with the management panel) or the request page (with driver offers).

type Post =
  | { kind: "trip"; createdAt: string; trip: TripListItem }
  | { kind: "request"; createdAt: string; request: PassengerRequest };

async function fetchMyPosts(): Promise<Post[]> {
  // Resilient: one failing bucket (or the requests call) must NOT reject the
  // whole query and hide everything else — that showed the «нет объявлений»
  // empty state even when the driver had trips.
  const emptyRes = { data: [], nextCursor: null };
  const [active, inTransit, past, cancelled, requests] = await Promise.all([
    listMyTrips("active", undefined, 30).catch(() => emptyRes),
    // in_transit = status 'active' but departureAt already passed — a separate
    // backend bucket; without it a departed-but-not-completed trip vanishes here.
    listMyTrips("in_transit", undefined, 30).catch(() => emptyRes),
    listMyTrips("past", undefined, 30).catch(() => emptyRes),
    listMyTrips("cancelled", undefined, 30).catch(() => emptyRes),
    listMyPassengerRequests().catch(() => ({ data: [] })),
  ]);
  const trips: Post[] = [...active.data, ...inTransit.data, ...past.data, ...cancelled.data].map((trip) => ({
    kind: "trip",
    createdAt: String(trip.createdAt ?? ""),
    trip,
  }));
  const reqs: Post[] = requests.data.map((request) => ({
    kind: "request",
    createdAt: String(request.createdAt ?? ""),
    request,
  }));
  return [...trips, ...reqs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function MyPostsTab({ show = "both" }: { show?: "trips" | "requests" | "both" }) {
  const t = useTranslations("my");
  const tB = useTranslations("bookings");
  const tSeats = useTranslations("booking_card");
  const { data: posts, isLoading } = useQuery({
    queryKey: ["my-posts"],
    queryFn: fetchMyPosts,
    staleTime: 15_000,
  });

  // Verification is suggested to EVERY unverified driver with a trip posted —
  // никогда не блокирует. После 3 завершённых поездок текст становится
  // праздничным («вы уже сделали N поездок»).
  const hasTripPosts = (posts ?? []).some((p) => p.kind === "trip");
  const completedTrips = (posts ?? []).filter(
    (p) => p.kind === "trip" && p.trip.status === "completed",
  ).length;
  const { data: verification } = useQuery({
    queryKey: ["driver-status"],
    queryFn: getDriverStatus,
    enabled: hasTripPosts,
    staleTime: 60_000,
  });
  const showVerifyNudge =
    hasTripPosts &&
    verification &&
    verification.status !== "verified" &&
    verification.status !== "pending" &&
    verification.status !== "docs_requested";

  if (isLoading) return <CardSkeletonList variant="trip" count={3} />;

  // Role-scoped view: driver hub shows only trips, passenger hub only requests.
  const visible = (posts ?? []).filter((p) => {
    const matchesShow = show === "both" ? true : show === "trips" ? p.kind === "trip" : p.kind === "request";
    if (!matchesShow) return false;
    // «Мои» lists only active items — finished/cancelled live in Profile → История.
    return p.kind === "trip" ? p.trip.status === "active" : p.request.status === "open";
  });

  if (visible.length === 0) {
    return (
      <EmptyState
        icon="route"
        iconTone="brand"
        title={t("posts_empty_title")}
        description={t("posts_empty_desc")}
        action={{
          label: t("publish"),
          href: show === "requests" ? "/requests/create" : "/trips/create",
        }}
        className="bg-white shadow-card ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800"
      />
    );
  }

  return (
    <div className="space-y-3.5">
      {showVerifyNudge && (
        <Link
          href="/profile/driver"
          className="flex items-center gap-3 rounded-3xl bg-brand-50 p-4 ring-1 ring-brand-200 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:ring-brand-500/25"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <BadgeCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-900 text-ink-900 dark:text-white">
              {completedTrips >= 3
                ? t("verify_nudge_title", { n: completedTrips })
                : t("verify_nudge_title_generic")}
            </span>
            <span className="block text-[13px] font-600 text-ink-600 dark:text-ink-300">
              {t("verify_nudge_text")}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-[14px] font-800 text-white">
            {t("verify_nudge_cta")}
          </span>
        </Link>
      )}
      {visible.map((p) =>
        p.kind === "trip" ? (
          <ListCard
            key={`t-${p.trip.id}`}
            when={fmtDT(p.trip.departureAt)}
            role={t("role_driver")}
            status={p.trip.status}
            origin={p.trip.originCity ?? ""}
            destination={p.trip.destinationCity ?? ""}
            avatar={<DriverAvatar name={p.trip.driver?.car?.make ?? p.trip.driver?.name ?? ""} src={p.trip.driver?.avatarUrl} size="md" />}
            actorName={p.trip.driver?.car ? `${p.trip.driver.car.make ?? ""} ${p.trip.driver.car.model ?? ""}`.trim() : p.trip.driver?.name}
            actorSub={<span className="text-[11.5px] font-700 text-ink-500">{p.trip.seatsAvailable} {tSeats("seats_word")}</span>}
            trailing={<span className="num text-[15px] font-900 text-sky-600">{p.trip.pricePerSeat} {tB("som")}</span>}
            href={`/trips/${p.trip.id}`}
          />
        ) : (
          <ListCard
            key={`r-${p.request.id}`}
            grape
            when={fmtD(p.request.departureDate)}
            role={t("role_request")}
            status={p.request.status}
            origin={p.request.originCity ?? ""}
            destination={p.request.destinationCity ?? ""}
            avatar={<DriverAvatar name={p.request.passenger?.name ?? ""} src={p.request.passenger?.avatarUrl} shape="square" size="md" />}
            actorName={p.request.passenger?.name}
            trailing={<span className="text-[12px] font-700 text-ink-500">{p.request.seatsNeeded} {tSeats("seats_word")}</span>}
            href={`/requests/${p.request.id}`}
          />
        ),
      )}
    </div>
  );
}
