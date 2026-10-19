"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CardSkeletonList } from "@/components/ui/card-skeleton";
import { SubTabBar } from "./sub-tab-bar";
import { PassengerCard } from "./passenger-card";
import type { Booking } from "@/lib/api/bookings";
import type { PendingRating } from "@/lib/api/ratings";

type SubTab = "active" | "history";

type BookingExt = Booking & {
  tripId?: string;
  trip?: { id?: string };
};

interface Props {
  isLoading: boolean;
  passengerSubTab: SubTab;
  onSubTabChange: (v: SubTab) => void;
  displayedBookings: BookingExt[];
  activeCount: number;
  historyCount: number;
  pendingRatingMap: Map<string, PendingRating>;
  onRate: (pr: PendingRating) => void;
  onCancel: (b: BookingExt) => void;
  /** hide the internal Активные/История bar when the parent owns those tabs */
  showSubTabs?: boolean;
}

export function PassengerTab({
  isLoading,
  passengerSubTab,
  onSubTabChange,
  displayedBookings,
  activeCount,
  historyCount,
  pendingRatingMap,
  onRate,
  onCancel,
  showSubTabs = true,
}: Props) {
  const t = useTranslations("bookings");

  return (
    <div className="flex flex-col gap-3.5">
      {isLoading ? (
        <CardSkeletonList variant="booking" count={4} />
      ) : (
        <>
          {showSubTabs && (
            <SubTabBar
              value={passengerSubTab}
              onChange={onSubTabChange}
              activeCount={activeCount}
              historyCount={historyCount}
            />
          )}
          {displayedBookings.length === 0 ? (
            <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center dark:bg-ink-900 dark:border-ink-800">
              {passengerSubTab === "active" ? (
                <>
                  <p className="text-[18px] font-bold text-ink-900 dark:text-white">{t("no_active_trips")}</p>
                  <p className="mt-2 text-[16px] font-600 text-ink-500">{t("no_active_hint")}</p>
                  <Link href="/trips">
                    <button
                      type="button"
                      className="mt-4 rounded-2xl bg-accent-500 px-6 py-2.5 text-[14px] font-bold text-accent-ink hover:bg-accent-400"
                    >
                      {t("find_trip_btn")}
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-[18px] font-bold text-ink-900 dark:text-white">{t("empty_history")}</p>
                  <p className="mt-2 text-[16px] font-600 text-ink-500">{t("history_hint")}</p>
                </>
              )}
            </div>
          ) : (
            displayedBookings.map((b) => {
              const tripId = b.tripId ?? b.trip?.id ?? "";
              const pr = pendingRatingMap.get(tripId);
              return (
                <PassengerCard
                  key={b.id}
                  booking={b}
                  pendingRating={pr}
                  onRate={pr ? () => onRate(pr) : undefined}
                  onCancel={passengerSubTab === "active" ? () => onCancel(b) : undefined}
                />
              );
            })
          )}
        </>
      )}
    </div>
  );
}
