"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { MessageCircle, Star, X, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DriverAvatar, Spinner } from "@/components/ui";

type BookingRowPassenger = {
  id?: string;
  name?: string;
  avatarUrl?: string | null;
  rating?: number | null;
  ratingCount?: number;
};

export function DriverBookingRow({
  id,
  bookingId,
  passenger,
  passengerId,
  seatsCount,
  comment,
  bStatus,
  rejectReasons,
  showRejectFor,
  rejectReason,
  acceptPending,
  rejectPending,
  onAccept,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  onSelectRejectReason,
  onCancelBooking,
}: {
  id: string;
  bookingId: string;
  passenger: BookingRowPassenger | undefined;
  passengerId: string | undefined;
  seatsCount: number | undefined;
  comment: string | undefined;
  bStatus: string;
  rejectReasons: string[];
  showRejectFor: string | null;
  rejectReason: string;
  acceptPending: boolean;
  rejectPending: boolean;
  onAccept: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onConfirmReject: () => void;
  onSelectRejectReason: (r: string) => void;
  onCancelBooking: () => void;
}) {
  const t = useTranslations("trip_actions");

  return (
    <div key={id} className="rounded-2xl border border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {passengerId ? (
            <Link href={`/drivers/${passengerId}`}>
              <DriverAvatar
                name={passenger?.name ?? "?"}
                src={passenger?.avatarUrl}
                size="sm"
              />
            </Link>
          ) : (
            <DriverAvatar name={passenger?.name ?? "?"} src={passenger?.avatarUrl} size="sm" />
          )}
          <div>
            <p className="text-[15px] font-bold text-ink-900 dark:text-white">
              {passenger?.name ?? t("passenger_fallback")}
            </p>
            {passenger?.rating != null && (
              <span className="flex items-center gap-0.5 text-[13px] text-ink-500 dark:text-ink-400">
                <Star className="h-3 w-3 fill-accent-400 text-accent-400" />
                {passenger.rating.toFixed(1)} · {passenger.ratingCount} {t("reviews_short")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-ink-600 dark:text-ink-300">{seatsCount} {t("seats_unit")}</span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-bold",
            bStatus === "accepted"
              ? "bg-brand-50 text-brand-700"
              : "bg-accent-50 text-accent-700",
          )}>
            {bStatus === "accepted" ? t("booking_accepted") : t("booking_pending")}
          </span>
        </div>
      </div>

      {comment && (
        <p className="mb-3 rounded-xl bg-ink-50 px-3 py-2 text-[13px] text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          «{comment}»
        </p>
      )}

      {showRejectFor === id ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {rejectReasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onSelectRejectReason(r)}
                className={cn(
                  "rounded-full border-2 px-2.5 py-1 text-[14px] font-bold",
                  rejectReason === r
                    ? "border-danger-400 bg-danger-50 text-danger-700"
                    : "border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancelReject}
              disabled={rejectPending}
              className="flex-1 rounded-xl border border-ink-200 py-2 text-[14px] font-bold text-ink-600 disabled:opacity-50 dark:border-ink-700 dark:text-ink-300"
            >
              {t("cancel_btn")}
            </button>
            <button
              type="button"
              onClick={onConfirmReject}
              disabled={rejectPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-danger-600 py-2 text-[14px] font-bold text-white disabled:opacity-50"
            >
              {rejectPending && <Spinner size={12} />}
              {t("reject_btn")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(["pending", "viewed"] as string[]).includes(bStatus) && (
            <>
              <button
                type="button"
                onClick={onAccept}
                disabled={acceptPending}
                className="flex items-center gap-1.5 rounded-xl bg-ink-900 px-3 py-2 text-[14px] font-bold text-white hover:bg-ink-800 disabled:opacity-50 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
              >
                {acceptPending ? <Spinner size={12} /> : <CheckCircle className="h-3.5 w-3.5" />}
                {t("accept_btn")}
              </button>
              <button
                type="button"
                onClick={onStartReject}
                className="flex items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2 text-[14px] font-bold text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300"
              >
                <XCircle className="h-3.5 w-3.5" />
                {t("reject_btn")}
              </button>
            </>
          )}
          <Link href={`/my/bookings/${bookingId}/chat`}>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-[14px] font-bold text-brand-700 hover:bg-brand-100"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {t("chat_btn")}
            </button>
          </Link>
          {bStatus === "accepted" && (
            <button
              type="button"
              onClick={onCancelBooking}
              className="flex items-center gap-1.5 rounded-xl border border-danger-200 px-3 py-2 text-[14px] font-bold text-danger-600 hover:bg-danger-50"
            >
              <X className="h-3.5 w-3.5" />
              {t("cancel_btn")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
