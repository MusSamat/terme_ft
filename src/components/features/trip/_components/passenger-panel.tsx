"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { MessageCircle, Star, X, Phone } from "lucide-react";
import { listMyBookings, cancelBooking, bookingTotal, type Booking } from "@/lib/api/bookings";
import { getPendingRatings } from "@/lib/api/ratings";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { toastSuccess, toastError } from "@/components/layout/quick-toast";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui";
import { QueryError } from "@/components/ui/query-error";
import { formatPrice } from "@/lib/utils/date";
import { PassengerCancelModal } from "./passenger-cancel-modal";
import { BookButton } from "@/components/features/trip/book-button";
import type { TripDetail } from "@/lib/api/trips";

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
    driver?: { phone?: string | null };
  };
};

function tripIdOf(b: BookingExt): string | undefined {
  return b.tripId ?? (b.trip as { id?: string } | undefined)?.id;
}

function BookView({ trip }: { trip: TripDetail }) {
  const t = useTranslations("trip_actions");
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-display font-extrabold text-brand-700 dark:text-brand-300">
          {formatPrice((trip.pricePerSeat as number | undefined) ?? 0)}
        </span>
        <span className="text-caption text-ink-500 dark:text-ink-400">{t("per_seat")}</span>
      </div>
      {trip.priceNegotiable && (
        <p className="mb-4 rounded-xl bg-accent-50 p-3 text-caption text-accent-700">
          {t("price_negotiable_hint")}
        </p>
      )}
      <BookButton
        tripId={(trip.id as string | undefined) ?? ""}
        seatsAvailable={(trip.seatsAvailable as number | undefined) ?? 0}
        driverId={trip.driverId as string | undefined}
        myBooking={(trip as { myBooking?: { id: string; status: string } | null }).myBooking ?? null}
      />
    </div>
  );
}

export function PassengerPanel({ trip, tripId }: { trip: TripDetail; tripId: string }) {
  const t = useTranslations("trip_actions");
  const tToasts = useTranslations("toasts");
  const fe = useFriendlyError();
  const qc = useQueryClient();

  const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    pending:                { label: t("status_pending"),             color: "text-accent-700", bg: "bg-accent-50",  dot: "bg-accent-500" },
    accepted:               { label: t("status_accepted"),            color: "text-brand-800",  bg: "bg-brand-50",   dot: "bg-brand-500" },
    completed:              { label: t("status_completed"),           color: "text-sky-700",  bg: "bg-sky-50",   dot: "bg-sky-400" },
    rejected:               { label: t("status_rejected"),            color: "text-coral-700",   bg: "bg-coral-50",    dot: "bg-coral-500"  },
    cancelled_by_passenger: { label: t("status_cancelled_by_you"),   color: "text-ink-600",  bg: "bg-ink-100 dark:bg-ink-800 dark:text-ink-300",  dot: "bg-ink-400" },
    cancelled_by_driver:    { label: t("status_cancelled_by_driver"), color: "text-ink-600",  bg: "bg-ink-100 dark:bg-ink-800 dark:text-ink-300",  dot: "bg-ink-400" },
    expired:                { label: t("status_expired"),             color: "text-ink-500",  bg: "bg-ink-50 dark:bg-ink-800 dark:text-ink-300",   dot: "bg-ink-300" },
  };

  const bookingsQuery = useQuery({
    queryKey: ["bookings", "my", "outgoing"],
    queryFn: () => listMyBookings(),
    staleTime: 30_000,
  });
  const { data: bookingsData, isLoading } = bookingsQuery;

  const { data: ratingsData } = useQuery({
    queryKey: ["ratings", "pending"],
    queryFn: getPendingRatings,
    staleTime: 60_000,
  });

  const myBooking = (bookingsData?.data as BookingExt[] | undefined)?.find(
    (b) => tripIdOf(b) === tripId,
  );
  const pendingRating = ratingsData?.data.find((r) => r.tripId === tripId);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReasons, setCancelReasons] = useState<string[]>([]);

  const cancelMut = useMutation({
    mutationFn: ({ id, reasons }: { id: string; reasons?: string[] }) =>
      cancelBooking(id, reasons),
    onSuccess: () => {
      toastSuccess(tToasts("booking_cancelled"));
      qc.invalidateQueries({ queryKey: ["bookings"] });
      setCancelOpen(false);
      setCancelReasons([]);
    },
    onError: (e) => toastError(fe(extractError(e))),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-2xl border border-ink-200 bg-white py-10 dark:border-ink-800 dark:bg-ink-900">
        <Spinner size={24} />
      </div>
    );
  }

  // Don't fall through to the booking form when we couldn't check for an
  // existing booking — that path risks a duplicate booking attempt.
  if (bookingsQuery.isError) {
    return <QueryError error={bookingsQuery.error} onRetry={() => void bookingsQuery.refetch()} />;
  }

  if (!myBooking) return <BookView trip={trip} />;

  const status = myBooking.status as string;
  const cfg = STATUS_CFG[status] ?? { label: status, color: "text-ink-700", bg: "bg-ink-50", dot: "bg-ink-400" };
  const driverPhone = (myBooking as BookingExt).trip?.driver?.phone;
  const canCancel = status === "pending" || status === "accepted";
  const canChat = status === "pending" || status === "accepted" || status === "completed";

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[12px] font-bold uppercase tracking-widest text-ink-400">
            {t("your_booking")}
          </p>
          <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold", cfg.bg, cfg.color)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
            {cfg.label}
          </span>
        </div>

        <div className="mb-4 flex gap-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{t("seats_label")}</p>
            <p className="text-[17px] font-bold text-ink-900 dark:text-white">{myBooking.seatsCount}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{t("sum_label")}</p>
            <p className="text-[17px] font-bold text-brand-700 dark:text-brand-300">
              {bookingTotal(myBooking, trip.pricePerSeat as number | undefined) ?? "—"} {t("som")}
            </p>
          </div>
        </div>

        {status === "accepted" && driverPhone && (
          <a
            href={`tel:${driverPhone}`}
            className="mb-4 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-[14px] font-bold text-brand-700 hover:bg-brand-100"
          >
            <Phone className="h-4 w-4" />
            {driverPhone}
          </a>
        )}
        {status === "pending" && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-[14px] font-700 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
            <Phone className="h-4 w-4" aria-hidden="true" />
            {t("phone_after_accept")}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {pendingRating && (
            <Link href={`/trips/${tripId}/rate/${pendingRating.counterpartId}`}>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-2.5 text-[14px] font-bold text-[#4A2C00] hover:bg-accent-600"
              >
                <Star className="h-4 w-4" />
                {t("rate_trip_btn")}
              </button>
            </Link>
          )}
          {canChat && (
            <Link href={`/my/bookings/${myBooking.id}/chat`}>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-[14px] font-bold text-brand-700 hover:bg-brand-100"
              >
                <MessageCircle className="h-4 w-4" />
                {t("open_chat_btn")}
              </button>
            </Link>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 py-2.5 text-[14px] font-bold text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300"
            >
              <X className="h-4 w-4" />
              {t("cancel_booking_btn")}
            </button>
          )}
        </div>
      </div>

      {cancelOpen && (
        <PassengerCancelModal
          reasons={cancelReasons}
          onToggle={(r) =>
            setCancelReasons((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]))
          }
          onConfirm={() =>
            cancelMut.mutate({ id: myBooking.id!, reasons: cancelReasons })
          }
          onClose={() => {
            setCancelOpen(false);
            setCancelReasons([]);
          }}
          isPending={cancelMut.isPending}
        />
      )}
    </div>
  );
}
