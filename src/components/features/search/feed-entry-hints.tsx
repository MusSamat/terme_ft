"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CarFront, ChevronRight, Clock, User, X } from "lucide-react";
import { getRecentRoutes, clearRecentRoutes, type RecentRoute } from "@/lib/recent-routes";
import { getPopularRoutes, type PopularRoute } from "@/lib/api/cities";
import { listMyTrips } from "@/lib/api/my-trips";
import { listMyPassengerRequests } from "@/lib/api/passenger-requests";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils/cn";

// Home entry body (redesign): three horizontal rails shown before a route is
// picked — «Куда едем» (top destinations), «Популярные маршруты» (from→to with
// live counts / prices) and «История поиска» (recent, local). Tapping any chip
// applies the route in place; the header stays put and results swap in.

type Tab = "trips" | "requests";

function Rail({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[15px] font-900 text-ink-800 dark:text-ink-100">{title}</p>
        {action}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">{children}</div>
    </div>
  );
}

export function FeedEntryHints({ onPick, tab = "trips" }: { onPick: (from: string, to: string) => void; tab?: Tab }) {
  const t = useTranslations("feed");
  const grape = tab === "requests";
  const [recent, setRecent] = useState<RecentRoute[]>([]);
  useEffect(() => setRecent(getRecentRoutes()), []);

  const { data: routes } = useQuery({
    queryKey: ["popular-routes"],
    queryFn: getPopularRoutes,
    staleTime: 5 * 60_000,
  });

  const popular = routes ?? [];

  // My active trips/requests → a compact block (no header) linking to «Мои».
  const authed = useAuth((s) => s.status === "authenticated");
  const { data: myTrips } = useQuery({
    queryKey: ["trips", "my", "active", "hub"],
    queryFn: () => listMyTrips("active"),
    enabled: authed,
    staleTime: 30_000,
  });
  const { data: myReqs } = useQuery({
    queryKey: ["passenger-requests", "my", "hub"],
    queryFn: listMyPassengerRequests,
    enabled: authed,
    staleTime: 30_000,
  });
  const activeTrips = (myTrips?.data ?? []).filter((x) => (x as { status?: string }).status === "active");
  const activeReqs = (myReqs?.data ?? []).filter((x) => (x as { status?: string }).status === "open");
  const mineIsTrip = activeTrips.length > 0;
  const mineCount = mineIsTrip ? activeTrips.length : activeReqs.length;
  const showMine = authed && mineCount > 0;

  // Top destinations — one best (highest-count) route per destination city.
  const destinations: PopularRoute[] = [];
  const seen = new Set<string>();
  for (const r of [...popular].sort((a, b) => b.tripCount - a.tripCount)) {
    if (seen.has(r.to)) continue;
    seen.add(r.to);
    destinations.push(r);
    if (destinations.length >= 8) break;
  }

  const countTone = grape
    ? "text-grape-600 dark:text-grape-300"
    : "text-brand-600 dark:text-brand-300";
  const goTone = grape ? "text-grape-500" : "text-brand-500";

  return (
    <div className="pt-2">
      {destinations.length > 0 && (
        <Rail title={grape ? t("destinations_requests") : t("destinations_trips")}>
          {destinations.map((r) => (
            <button
              key={`d-${r.to}`}
              type="button"
              onClick={() => onPick(r.from, r.to)}
              className="flex shrink-0 items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-left shadow-card ring-1 ring-ink-100 transition-colors hover:ring-ink-200 dark:bg-ink-900 dark:ring-ink-800"
            >
              <div className="min-w-0">
                <div className="whitespace-nowrap text-[14px] font-900 text-ink-900 dark:text-white">{r.to}</div>
                {!grape && r.tripCount > 0 && (
                  <div className={cn("text-[11px] font-800", countTone)}>{t("trips_count", { n: r.tripCount })}</div>
                )}
                {grape && r.minPrice != null && (
                  <div className={cn("text-[11px] font-800", countTone)}>{t("from_price", { n: r.minPrice })}</div>
                )}
              </div>
              <ArrowRight className={cn("h-4 w-4 shrink-0", goTone)} aria-hidden="true" />
            </button>
          ))}
        </Rail>
      )}

      {popular.length > 0 && (
        <Rail title={t("popular_title")}>
          {popular.map((r) => (
            <button
              key={`p-${r.from}-${r.to}`}
              type="button"
              onClick={() => onPick(r.from, r.to)}
              className="flex shrink-0 flex-col gap-1.5 rounded-2xl bg-white px-3.5 py-3 text-left shadow-card ring-1 ring-ink-100 transition-colors hover:ring-ink-200 dark:bg-ink-900 dark:ring-ink-800"
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-900 text-ink-900 dark:text-white">
                {r.from}
                <ArrowRight className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                {r.to}
              </span>
              <span className={cn("text-[11px] font-800", countTone)}>
                {!grape && r.tripCount > 0
                  ? t("trips_count", { n: r.tripCount })
                  : r.minPrice != null
                    ? t("from_price", { n: r.minPrice })
                    : " "}
              </span>
            </button>
          ))}
        </Rail>
      )}

      {showMine && (
        <Link
          href={`/my/bookings?tab=${mineIsTrip ? "trips" : "requests"}`}
          className="mb-5 flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-card ring-1 ring-ink-100 transition-colors hover:ring-ink-200 dark:bg-ink-900 dark:ring-ink-800"
        >
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              mineIsTrip ? "bg-brand-600/10 text-brand-600 dark:text-brand-300" : "bg-grape-600/10 text-grape-600 dark:text-grape-300",
            )}
          >
            {mineIsTrip ? <CarFront className="h-5 w-5" aria-hidden="true" /> : <User className="h-5 w-5" aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-900 text-ink-900 dark:text-white">
              {t(mineIsTrip ? "mine_trips_line" : "mine_requests_line", { n: mineCount })}
            </span>
            <span className="block truncate text-[12.5px] font-700 text-ink-400">
              {t(mineIsTrip ? "mine_trips_sub" : "mine_requests_sub")}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true" />
        </Link>
      )}

      {recent.length > 0 && (
        <Rail
          title={t("search_history")}
          action={
            <button
              type="button"
              onClick={() => { clearRecentRoutes(); setRecent([]); }}
              className="flex items-center gap-1 text-[12px] font-800 text-ink-400 transition-colors hover:text-ink-600 dark:hover:text-ink-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t("clear")}
            </button>
          }
        >
          {recent.map((r, i) => (
            <button
              key={`r-${r.from}-${r.to}-${i}`}
              type="button"
              onClick={() => onPick(r.from, r.to)}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl bg-ink-50 px-3.5 py-2.5 text-[12.5px] font-800 text-ink-800 transition-colors hover:bg-ink-100 dark:bg-ink-800/60 dark:text-ink-100 dark:hover:bg-ink-800"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
              {r.from}
              <span className="text-ink-400">→</span>
              {r.to}
            </button>
          ))}
        </Rail>
      )}
    </div>
  );
}
