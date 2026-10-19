"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Star, X, ArrowRight, Users, CheckCircle2, Minus, Plus, Phone } from "lucide-react";
import {
  listIncomingBookings,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  type Booking,
} from "@/lib/api/bookings";
import { getPendingRatings } from "@/lib/api/ratings";
import { adjustTripSeats, cancelTrip, completeTrip, updateTrip, type TripDetail } from "@/lib/api/trips";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { toastSuccess, toastError } from "@/components/layout/quick-toast";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui";
import { QueryError } from "@/components/ui/query-error";
import { Overlay } from "./modal-overlay";
import { DriverBookingRow } from "./driver-booking-row";

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

// Edit the trip's price / comment / luggage (mirrors the Flutter trip edit).
// Seats aren't here — they change live via the ± stepper in the panel.
function TripEditModal({ trip, tripId, onClose }: { trip: TripDetail; tripId: string; onClose: () => void }) {
  const t = useTranslations("trip_actions");
  const tToasts = useTranslations("toasts");
  const fe = useFriendlyError();
  const qc = useQueryClient();
  const router = useRouter();
  const [price, setPrice] = useState(String((trip.pricePerSeat as number | undefined) ?? ""));
  const [comment, setComment] = useState((trip.comment as string | undefined) ?? "");
  const [luggage, setLuggage] = useState<"yes" | "small" | "no">((trip.luggage as "yes" | "small" | "no" | undefined) ?? "small");
  const [confirming, setConfirming] = useState(false);

  const saveMut = useMutation({
    mutationFn: () =>
      updateTrip(tripId, { pricePerSeat: Number(price), comment: comment.trim() || null, luggage }),
    onSuccess: () => {
      toastSuccess(tToasts("saved"));
      void qc.invalidateQueries({ queryKey: ["trip", tripId] });
      void qc.invalidateQueries({ queryKey: ["my-trips"] });
      void qc.invalidateQueries({ queryKey: ["my-posts"] });
      router.refresh(); // the page renders the SSR trip prop
      onClose();
    },
    onError: (e) => toastError(fe(extractError(e))),
  });

  const priceNum = Number(price);
  const priceOk = /^\d+$/.test(price) && priceNum >= 50 && priceNum <= 10000;
  const LUGGAGE: Array<"yes" | "small" | "no"> = ["yes", "small", "no"];

  return (
    <Overlay onClose={onClose}>
      <h2 className="mb-3 text-[20px] font-extrabold text-ink-900 dark:text-white">{t("edit_title")}</h2>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-800 uppercase tracking-wide text-ink-400">{t("price_label")}</label>
          <input
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className="h-11 w-full rounded-xl border-2 border-ink-200 bg-ink-50 px-3 text-[16px] font-800 text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-800 uppercase tracking-wide text-ink-400">{t("comment_label")}</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
            rows={2}
            className="w-full rounded-xl border-2 border-ink-200 bg-ink-50 px-3 py-2 text-[15px] font-600 text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-800 uppercase tracking-wide text-ink-400">{t("luggage_label")}</label>
          <div className="flex gap-2">
            {LUGGAGE.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLuggage(l)}
                className={cn(
                  "rounded-full border-2 px-4 py-1.5 text-[13px] font-800 transition",
                  luggage === l ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300",
                )}
              >
                {t(`luggage_${l}`)}
              </button>
            ))}
          </div>
        </div>
        {confirming ? (
          <div className="mt-1 flex flex-col gap-2">
            <p className="text-center text-[14px] font-800 text-ink-700 dark:text-ink-200">{t("edit_confirm")}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirming(false)} aria-label={t("back_btn")} className="flex h-11 flex-1 items-center justify-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                <X className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="h-11 flex-[2] rounded-xl bg-accent-500 text-[15px] font-900 text-accent-ink hover:bg-accent-400 disabled:opacity-50">
                {saveMut.isPending ? "…" : t("save")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={!priceOk}
            onClick={() => setConfirming(true)}
            className="mt-1 h-11 rounded-xl bg-accent-500 text-[15px] font-900 text-accent-ink hover:bg-accent-400 disabled:opacity-40"
          >
            {t("save")}
          </button>
        )}
      </div>
    </Overlay>
  );
}

export function DriverPanel({ trip, tripId }: { trip: TripDetail; tripId: string }) {
  const t = useTranslations("trip_actions");
  const tToasts = useTranslations("toasts");
  const fe = useFriendlyError();
  const qc = useQueryClient();

  const router = useRouter();

  const REJECT_REASONS = [
    t("reject_reason_no_seats"),
    t("reject_reason_not_route"),
    t("reject_reason_plans"),
    t("reject_reason_other"),
  ];

  const incomingQuery = useQuery({
    queryKey: ["bookings", "incoming", tripId],
    queryFn: () => listIncomingBookings(tripId),
    staleTime: 30_000,
  });
  const { data: incoming, isLoading } = incomingQuery;

  const { data: ratingsData } = useQuery({
    queryKey: ["ratings", "pending"],
    queryFn: getPendingRatings,
    staleTime: 60_000,
  });

  const acceptMut = useMutation({
    mutationFn: acceptBooking,
    onSuccess: () => {
      toastSuccess(tToasts("booking_accepted"));
      qc.invalidateQueries({ queryKey: ["bookings", "incoming", tripId] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["my-posts"] });
      router.refresh(); // free-seat count comes from the SSR trip prop
    },
    onError: (e) => toastError(fe(extractError(e))),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectBooking(id, rejectReason || undefined),
    onSuccess: () => {
      toastSuccess(tToasts("booking_rejected"));
      qc.invalidateQueries({ queryKey: ["bookings", "incoming", tripId] });
      setShowRejectFor(null);
      setRejectReason("");
    },
    onError: (e) => toastError(fe(extractError(e))),
  });
  // Manual ±1 seats («занято по телефону» / «освободилось») — call-first flow.
  // `trip` arrives as an SSR prop, so the fresh count comes from the mutation
  // response (local state) + router.refresh() re-syncs the server payload.
  const [seatsLocal, setSeatsLocal] = useState<number | null>(null);
  const seatsFree = seatsLocal ?? (trip.seatsAvailable as number | undefined) ?? 0;
  const tripActive = (trip.status as string | undefined) === "active";
  const seatsMut = useMutation({
    mutationFn: (delta: 1 | -1) => adjustTripSeats(tripId, delta),
    onSuccess: (updated) => {
      setSeatsLocal((updated.seatsAvailable as number | undefined) ?? null);
      qc.invalidateQueries({ queryKey: ["trips"] });
      router.refresh();
    },
    onError: (e) => toastError(fe(extractError(e))),
  });
  const completeTripMut = useMutation({
    mutationFn: () => completeTrip(tripId),
    onSuccess: () => {
      toastSuccess(tToasts("trip_completed"));
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["my-posts"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      router.refresh();
    },
    onError: (e) => toastError(fe(extractError(e))),
  });
  const cancelTripMut = useMutation({
    mutationFn: () => cancelTrip(tripId),
    onSuccess: () => {
      toastSuccess(tToasts("trip_cancelled"));
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["my-posts"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      setCancelTripOpen(false);
      router.refresh();
    },
    onError: (e) => toastError(fe(extractError(e))),
  });
  const cancelBookingMut = useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => {
      toastSuccess(tToasts("booking_cancelled"));
      qc.invalidateQueries({ queryKey: ["bookings", "incoming", tripId] });
      setCancelBookingTarget(null);
      router.refresh();
    },
    onError: (e) => toastError(fe(extractError(e))),
  });

  const [showRejectFor, setShowRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelBookingTarget, setCancelBookingTarget] = useState<string | null>(null);
  const [cancelTripOpen, setCancelTripOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const bookings = ((incoming?.data ?? []) as BookingExt[]).filter((b) =>
    ["pending", "viewed", "accepted"].includes(b.status as string),
  );
  const pendingCount = bookings.filter(
    (b) => (["pending", "viewed"] as string[]).includes(b.status as string),
  ).length;
  const acceptedCount = bookings.filter((b) => b.status === "accepted").length;
  const pendingRatings = ratingsData?.data.filter((r) => r.tripId === tripId) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-extrabold text-ink-900 dark:text-white">{t("trip_control_title")}</p>
          <span className={cn(
            "rounded-full px-2.5 py-1 text-[12px] font-bold",
            (trip.status as string | undefined) === "active"
              ? "bg-brand-50 text-brand-700"
              : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
          )}>
            {(trip.status as string | undefined) === "active" ? t("trip_active") : t("trip_completed")}
          </span>
        </div>

        <div className="mb-2 grid grid-cols-3 gap-2">
          {/* «Свободно» tile IS the control — stepper right in the number */}
          <div className="rounded-xl bg-ink-50 px-1.5 py-2 text-center dark:bg-ink-800">
            <div className="flex items-center justify-center gap-1.5">
              {/* Stepper only while the trip is active — a finished trip's
                  seats are history, and backend rejects the change anyway. */}
              {tripActive && (
              <button
                type="button"
                aria-label={t("seat_taken_phone")}
                title={t("seat_taken_phone")}
                disabled={seatsMut.isPending || seatsFree <= 0}
                onClick={() => seatsMut.mutate(-1)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-ink-600 shadow-xs ring-1 ring-ink-200 transition-colors hover:bg-ink-100 disabled:opacity-35 dark:bg-ink-900 dark:text-ink-300 dark:ring-ink-700"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              )}
              <p className="min-w-[22px] text-[20px] font-extrabold leading-none text-ink-900 dark:text-white">
                {seatsMut.isPending ? <Spinner size={14} /> : seatsFree}
              </p>
              {tripActive && (
              <button
                type="button"
                aria-label={t("seat_freed")}
                title={t("seat_freed")}
                disabled={seatsMut.isPending}
                onClick={() => seatsMut.mutate(1)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-xs ring-1 ring-ink-200 transition-colors hover:bg-brand-50 disabled:opacity-35 dark:bg-ink-900 dark:text-brand-300 dark:ring-ink-700"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              )}
            </div>
            <p className="mt-1 text-[11px] font-bold uppercase text-ink-500 dark:text-ink-400">{t("seats_free")}</p>
          </div>
          <div className="rounded-xl bg-accent-50 p-2.5 text-center">
            <p className="text-[20px] font-extrabold text-accent-700">{pendingCount}</p>
            <p className="text-[11px] font-bold uppercase text-accent-600">{t("seats_pending")}</p>
          </div>
          <div className="rounded-xl bg-brand-50 p-2.5 text-center">
            <p className="text-[20px] font-extrabold text-brand-700">{acceptedCount}</p>
            <p className="text-[11px] font-bold uppercase text-brand-600">{t("seats_accepted")}</p>
          </div>
        </div>
        {/* One quiet line explains the stepper's job (phone deals) */}
        {tripActive && (
          <p className="mb-3 flex items-center gap-1.5 text-[12px] font-600 text-ink-400">
            <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
            {t("seats_phone_hint")}
          </p>
        )}

        {(trip.status as string | undefined) === "active" && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="mb-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-ink-200 text-[13px] font-800 text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
          >
            {t("edit_btn")}
          </button>
        )}

        {editOpen && <TripEditModal trip={trip} tripId={tripId} onClose={() => setEditOpen(false)} />}

        {(trip.status as string | undefined) === "active" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={completeTripMut.isPending}
              onClick={() => completeTripMut.mutate()}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ink-900 text-[13px] font-800 text-white transition-colors hover:bg-ink-800 disabled:opacity-50 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
            >
              {completeTripMut.isPending ? <Spinner size={14} /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              {t("complete_trip_btn")}
            </button>
            <button
              type="button"
              onClick={() => setCancelTripOpen(true)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-danger-200 text-[13px] font-800 text-danger-600 transition-colors hover:bg-danger-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              {t("cancel_trip_btn")}
            </button>
          </div>
        )}
      </div>

      {pendingRatings.map((pr) => (
        <Link
          key={pr.counterpartId}
          href={`/trips/${tripId}/rate/${pr.counterpartId}`}
          className="flex items-center gap-3 rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 hover:bg-accent-100"
        >
          <Star className="h-5 w-5 flex-shrink-0 fill-accent-400 text-accent-400" />
          <div className="flex-1">
            <p className="text-[14px] font-bold text-ink-900">{t("rate_passenger_title")}</p>
            <p className="text-[13px] text-ink-600">{pr.counterpartName}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-brand-600" />
        </Link>
      ))}

      {isLoading ? (
        <div className="flex justify-center rounded-2xl border border-ink-100 bg-white py-8 dark:border-ink-800 dark:bg-ink-900">
          <Spinner size={20} />
        </div>
      ) : incomingQuery.isError ? (
        <QueryError error={incomingQuery.error} onRetry={() => void incomingQuery.refetch()} />
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 text-center dark:border-ink-800 dark:bg-ink-900">
          <Users className="mx-auto mb-2 h-8 w-8 text-ink-300" />
          <p className="text-[15px] font-bold text-ink-700 dark:text-ink-200">{t("no_requests")}</p>
        </div>
      ) : (
        bookings.map((b) => {
          const bStatus = b.status as string;
          const passengerId = b.passengerId ?? b.passenger?.id;
          return (
            <DriverBookingRow
              key={b.id}
              id={b.id!}
              bookingId={b.id!}
              passenger={b.passenger}
              passengerId={passengerId}
              seatsCount={b.seatsCount}
              comment={b.comment ?? undefined}
              bStatus={bStatus}
              rejectReasons={REJECT_REASONS}
              showRejectFor={showRejectFor}
              rejectReason={rejectReason}
              acceptPending={acceptMut.isPending && acceptMut.variables === b.id}
              rejectPending={rejectMut.isPending}
              onAccept={() => acceptMut.mutate(b.id!)}
              onStartReject={() => { setShowRejectFor(b.id!); setRejectReason(""); }}
              onCancelReject={() => { setShowRejectFor(null); setRejectReason(""); }}
              onConfirmReject={() => rejectMut.mutate(b.id!)}
              onSelectRejectReason={setRejectReason}
              onCancelBooking={() => setCancelBookingTarget(b.id!)}
            />
          );
        })
      )}

      {cancelBookingTarget && (
        <Overlay onClose={() => setCancelBookingTarget(null)}>
          <h2 className="mb-2 text-[20px] font-extrabold text-ink-900 dark:text-white">{t("cancel_booking_title")}</h2>
          <div className="mt-2 rounded-2xl border border-danger-200 bg-danger-50 p-4">
            <p className="text-[14px] font-bold text-danger-700">
              {t("cancel_booking_warn")}
            </p>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setCancelBookingTarget(null)}
              className="flex-1 rounded-xl border border-ink-200 py-2.5 text-[14px] font-bold text-ink-700 dark:border-ink-700 dark:text-ink-200"
            >
              {t("back_btn")}
            </button>
            <button
              type="button"
              onClick={() => cancelBookingMut.mutate(cancelBookingTarget)}
              disabled={cancelBookingMut.isPending}
              className="flex-1 rounded-xl bg-danger-600 py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
            >
              {cancelBookingMut.isPending ? t("cancelling") : t("confirm_btn")}
            </button>
          </div>
        </Overlay>
      )}

      {cancelTripOpen && (
        <Overlay onClose={() => setCancelTripOpen(false)}>
          <h2 className="mb-2 text-[20px] font-extrabold text-ink-900 dark:text-white">{t("cancel_trip_title")}</h2>
          <div className="mt-2 rounded-2xl border border-danger-200 bg-danger-50 p-4">
            <p className="text-[14px] font-bold text-danger-700">
              {t("cancel_trip_warn")}
              {acceptedCount > 0 && ` ${t("cancel_trip_rating_warn")}`}
            </p>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setCancelTripOpen(false)}
              className="flex-1 rounded-xl border border-ink-200 py-2.5 text-[14px] font-bold text-ink-700 dark:border-ink-700 dark:text-ink-200"
            >
              {t("back_btn")}
            </button>
            <button
              type="button"
              onClick={() => cancelTripMut.mutate()}
              disabled={cancelTripMut.isPending}
              className="flex-1 rounded-xl bg-danger-600 py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
            >
              {cancelTripMut.isPending ? t("cancelling") : t("confirm_btn")}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
