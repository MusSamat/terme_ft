"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui";
import { QueryError } from "@/components/ui/query-error";
import { ListCard } from "@/components/ui/list-card";
import { listMyBookings, type Booking } from "@/lib/api/bookings";
import { listMyTrips } from "@/lib/api/my-trips";
import { cn } from "@/lib/utils/cn";

// Bookings that represent an ACTUAL arranged ride — the only ones kept in trip
// history (inDrive-style). Never-confirmed states (pending/viewed/rejected/
// expired) never became a trip, so they aren't history. An 'accepted' booking
// whose time has passed is treated as completed.
const RIDE_BOOKING = new Set([
  "completed",
  "no_show",
  "cancelled_by_passenger",
  "cancelled_by_driver",
  "cancelled_late",
]);

type BookingExt = Booking & {
  trip?: { originCity?: string; destinationCity?: string; departureAt?: string };
};

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) +
    " · " +
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  );
}

type Sub = "bookings" | "trips";

/** Profile → «История»: only trips that actually happened — bookings taken as a
 *  passenger, and trips published as a driver. Mirrors the Flutter TripHistoryScreen. */
export function HistoryTab() {
  const tm = useTranslations("my");
  const [sub, setSub] = useState<Sub>("bookings");

  const Pill = ({ value, label }: { value: Sub; label: string }) => (
    <button
      type="button"
      onClick={() => setSub(value)}
      className={cn(
        "h-8 rounded-full px-3.5 text-[12.5px] font-800 transition-colors",
        sub === value
          ? "bg-brand-600 text-white"
          : "border border-ink-200 bg-white text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Pill value="bookings" label={tm("tab_bookings")} />
        <Pill value="trips" label={tm("tab_trips")} />
      </div>
      {sub === "bookings" ? <BookingsHistory /> : <TripsHistory />}
    </div>
  );
}

function Empty() {
  const t = useTranslations("profile");
  return (
    <div className="rounded-3xl bg-white p-10 text-center shadow-card dark:bg-ink-900">
      <p className="text-[15px] font-medium text-ink-500">{t("history_empty")}</p>
    </div>
  );
}

function BookingsHistory() {
  const t = useTranslations("profile");
  const q = useQuery({
    queryKey: ["bookings", "my", "history"],
    queryFn: () => listMyBookings(),
  });

  if (q.isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (q.isError) return <QueryError error={q.error} onRetry={() => void q.refetch()} />;

  const now = Date.now();
  const items = ((q.data?.data ?? []) as BookingExt[])
    .filter((b) => {
      const s = (b.status ?? "") as string;
      return (
        RIDE_BOOKING.has(s) ||
        (s === "accepted" && new Date(b.trip?.departureAt ?? 0).getTime() < now)
      );
    })
    .sort((a, b) => (b.trip?.departureAt ?? "").localeCompare(a.trip?.departureAt ?? ""));

  if (items.length === 0) return <Empty />;

  return (
    <div className="flex flex-col gap-3">
      {items.map((b) => (
        <ListCard
          key={b.id}
          when={fmt(b.trip?.departureAt)}
          role={t("history_as_passenger")}
          status={RIDE_BOOKING.has((b.status ?? "") as string) ? ((b.status ?? "") as string) : "completed"}
          origin={b.trip?.originCity ?? ""}
          destination={b.trip?.destinationCity ?? ""}
        />
      ))}
    </div>
  );
}

function TripsHistory() {
  const t = useTranslations("profile");
  const past = useQuery({ queryKey: ["trips", "my", "past"], queryFn: () => listMyTrips("past") });
  const cancelled = useQuery({ queryKey: ["trips", "my", "cancelled"], queryFn: () => listMyTrips("cancelled") });

  if (past.isLoading || cancelled.isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (past.isError) return <QueryError error={past.error} onRetry={() => void past.refetch()} />;

  const items = [...(past.data?.data ?? []), ...(cancelled.data?.data ?? [])].sort((a, b) =>
    (b.departureAt ?? "").localeCompare(a.departureAt ?? ""),
  );

  if (items.length === 0) return <Empty />;

  return (
    <div className="flex flex-col gap-3">
      {items.map((tr) => (
        <ListCard
          key={tr.id}
          when={fmt(tr.departureAt)}
          role={t("history_as_driver")}
          status={(tr.status ?? "completed") as string}
          origin={tr.originCity ?? ""}
          destination={tr.destinationCity ?? ""}
        />
      ))}
    </div>
  );
}
