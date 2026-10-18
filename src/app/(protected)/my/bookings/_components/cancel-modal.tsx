"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Booking } from "@/lib/api/bookings";
import { useRouteNames } from "@/lib/hooks/use-route-names";

type BookingExt = Booking & {
  tripId?: string;
  passengerId?: string;
  totalPrice?: number;
  passenger?: {
    id?: string;
    name?: string;
    avatarUrl?: string | null;
    rating?: number | null;
    ratingCount?: number;
  };
  trip?: {
    id?: string;
    originCity?: string;
    destinationCity?: string;
    departureAt?: string;
    pricePerSeat?: number;
    driver?: { name?: string; avatarUrl?: string | null };
    driverId?: string;
  };
};

const LATE_CANCEL_HOURS = 2;

function fmtDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function isLateCancel(departureAt?: string): boolean {
  if (!departureAt) return false;
  const msUntil = new Date(departureAt).getTime() - Date.now();
  return msUntil > 0 && msUntil < LATE_CANCEL_HOURS * 60 * 60 * 1000;
}

export function CancelModal({
  booking,
  isPending,
  onConfirm,
  onClose,
}: {
  booking: BookingExt;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const rn = useRouteNames();
  const t = useTranslations("bookings");
  const late = isLateCancel(booking.trip?.departureAt);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-[24px] bg-white shadow-2xl sm:max-w-[440px] sm:rounded-3xl dark:bg-ink-900">
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-ink-200 dark:bg-ink-700" />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-8 pt-4">
          <h2 className="text-[20px] font-extrabold text-ink-900 dark:text-white">{t("cancel_booking_title")}</h2>
          <p className="mt-1 text-[16px] font-600 text-ink-500">
            {rn(booking.trip).from} → {rn(booking.trip).to}
            {booking.trip?.departureAt ? ` · ${fmtDate(booking.trip.departureAt)}` : ""}
          </p>

          {late && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-coral-50 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-coral-600" />
              <div>
                <p className="text-[14px] font-bold text-coral-800">{t("late_cancel")}</p>
                <p className="mt-0.5 text-[13px] text-coral-700">
                  {t("cancel_late_warn", { n: LATE_CANCEL_HOURS })}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-ink-50 p-4 text-[13px] text-ink-600 dark:bg-ink-800">
            <p className="font-bold text-ink-800 dark:text-white">{t("cancel_policy_title")}</p>
            <ul className="mt-1.5 space-y-1">
              <li>{t("cancel_policy_free", { n: LATE_CANCEL_HOURS })}</li>
              <li>{t("cancel_policy_warn", { n: LATE_CANCEL_HOURS })}</li>
              <li>{t("cancel_policy_repeat")}</li>
            </ul>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className={cn(
                "w-full rounded-2xl py-3 text-[16px] font-bold transition-colors",
                late
                  ? "bg-coral-600 text-white hover:bg-coral-700 disabled:opacity-50"
                  : "bg-ink-900 text-white hover:bg-ink-800 disabled:opacity-50",
              )}
            >
              {isPending ? t("cancelling") : t("cancel_confirm")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-ink-200 py-3 text-[16px] font-bold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300"
            >
              {t("keep_booking")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
