"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, Clock, MessageCircle, Send, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createBooking } from "@/lib/api/bookings";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { uuid } from "@/lib/utils/uuid";
import { saveDeferredAction } from "@/lib/auth/deferred-action";
import { useAuth } from "@/store/auth";
import { Button, NotifCard, Spinner, Textarea } from "@/components/ui";
import { formatPrice } from "@/lib/utils/date";

type Step = "form" | "waiting";

interface Props {
  tripId: string;
  pricePerSeat: number;
  seatsAvailable: number;
  initialSeats?: number;
  /** Close the hosting modal (default: navigate back). */
  onCancel?: () => void;
  bookingId?: string;
}

export function BookForm({ tripId, pricePerSeat, seatsAvailable, initialSeats = 1, onCancel }: Props) {
  const t = useTranslations("book_form");
  const router = useRouter();
  const status = useAuth((s) => s.status);
  const fe = useFriendlyError();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("form");
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [seats, setSeats] = useState(Math.min(initialSeats, Math.max(1, seatsAvailable)));
  const [comment, setComment] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => uuid(), []);

  useEffect(() => {
    if (status === "anonymous") {
      saveDeferredAction({ action: "book_trip", trip_id: tripId, seats, comment });
      router.replace("/auth/login");
    }
  }, [status, tripId, seats, comment, router]);

  const mutation = useMutation({
    mutationFn: () =>
      createBooking(
        { tripId, seatsCount: seats, comment: comment.trim() || undefined },
        idempotencyKey,
      ),
    onSuccess: (booking) => {
      setCreatedBookingId(booking.id ?? null);
      setStep("waiting");
      // Refresh the outgoing-bookings cache so the trip card badge and the
      // detail CTA flip to "already booked" immediately — and the trip detail
      // + feed so seat counts / my-booking status are no longer stale.
      void qc.invalidateQueries({ queryKey: ["bookings"] });
      void qc.invalidateQueries({ queryKey: ["trip", tripId] });
      void qc.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (e) => {
      setServerError(fe(extractError(e)));
    },
  });

  const max = Math.min(4, Math.max(1, seatsAvailable));
  const total = pricePerSeat * seats;
  const disabled = seatsAvailable <= 0 || mutation.isPending;

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex justify-center py-12">
        <Spinner size={28} />
      </div>
    );
  }

  if (step === "waiting") {
    return (
      <div className="rounded-3xl border border-ink-100 bg-white p-8 text-center shadow-sm dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent-50">
          <Clock className="h-9 w-9 text-accent-500" aria-hidden="true" />
        </div>
        <h2 className="text-[22px] font-extrabold text-ink-900 dark:text-white">{t("request_sent")}</h2>
        <p className="mx-auto mt-2 max-w-[340px] text-[15px] leading-relaxed text-ink-500 dark:text-ink-400">
          {t("waiting_hint")}
        </p>

        {/* Progress bar */}
        <div className="mx-auto mt-5 h-1 w-full max-w-[320px] overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <div className="h-full w-2/5 rounded-full bg-accent-500" />
        </div>

        {/* Pre-booking chat notice */}
        <div className="mx-auto mt-5 max-w-[400px] rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-left">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="h-3.5 w-3.5 text-brand-700 flex-shrink-0" aria-hidden="true" />
            <span className="text-[14px] font-extrabold text-brand-800">{t("chat_title")}</span>
          </div>
          <p className="text-[13px] leading-relaxed text-brand-700">
            {t("chat_hint")}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/my/bookings">
            <Button variant="outline" size="md" className="w-full sm:w-auto">
              {t("my_trips")}
            </Button>
          </Link>
          {createdBookingId && (
            <Link href={`/my/bookings/${createdBookingId}/chat`}>
              <Button variant="primary" size="md" className="w-full sm:w-auto">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {t("open_chat")}
              </Button>
            </Link>
          )}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-ink-400">
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          {t("notif_hint")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setServerError(null);
        if (disabled) return;
        mutation.mutate();
      }}
      className="flex flex-col gap-3"
      noValidate
    >
      {serverError && (
        <NotifCard variant="error" title={t("error_title")}>
          {serverError}
        </NotifCard>
      )}

      {/* Seats + price in one compact card. Label + sub stack vertically on the
          left (sub can be long — «700 сом × 1 · Наличными») so it never pushes
          the stepper / amount off-screen on mobile. */}
      <div className="divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-tight text-ink-900 dark:text-white">{t("seats_label")}</p>
              <p className="truncate text-[13px] font-semibold text-ink-400">{t("available", { n: seatsAvailable })}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              aria-label={t("seat_minus")}
              disabled={seats <= 1 || disabled}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-300 text-[20px] font-bold text-ink-900 hover:bg-ink-100 disabled:opacity-40 dark:border-ink-700 dark:text-white dark:hover:bg-ink-800"
            >
              −
            </button>
            <span className="min-w-[24px] text-center text-[20px] font-extrabold text-ink-900 dark:text-white">{seats}</span>
            <button
              type="button"
              onClick={() => setSeats((s) => Math.min(max, s + 1))}
              aria-label={t("seat_plus")}
              disabled={seats >= max || disabled}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-300 text-[20px] font-bold text-ink-900 hover:bg-ink-100 disabled:opacity-40 dark:border-ink-700 dark:text-white dark:hover:bg-ink-800"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Wallet className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-tight text-ink-900 dark:text-white">{t("pay_to_driver")}</p>
              <p className="truncate text-[13px] font-semibold text-ink-400">{t("price_breakdown", { price: String(pricePerSeat), seats })}</p>
            </div>
          </div>
          <span className="shrink-0 text-[20px] font-extrabold text-brand-700">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Comment — compact: chips + 2-row textarea */}
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-ink-500 dark:text-ink-400">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {t("comment_label")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[t("chip_bus_station"), t("chip_small_luggage"), t("chip_alone"), t("chip_early")].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setComment((prev) => (prev ? `${prev}, ${chip.toLowerCase()}` : chip))}
              className="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[14px] font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"
            >
              {chip}
            </button>
          ))}
        </div>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 300))}
          placeholder={t("comment_placeholder")}
          rows={2}
        />
      </div>

      {/* Warning — one compact line */}
      <div className="flex items-center gap-2 rounded-xl border border-accent-100 bg-accent-50 px-3 py-2">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-accent-600" aria-hidden="true" />
        <span className="text-[14px] font-semibold text-accent-700">{t("warning_hint")}</span>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={() => (onCancel ? onCancel() : router.back())}>
          {t("cancel")}
        </Button>
        <Button type="submit" variant="submit" size="lg" disabled={disabled} className="min-w-0 flex-[2]">
          <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{mutation.isPending ? t("sending") : t("submit")}</span>
        </Button>
      </div>
    </form>
  );
}
