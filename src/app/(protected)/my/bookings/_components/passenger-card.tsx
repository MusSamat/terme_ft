"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Star, X, MessageCircle } from "lucide-react";
import { DriverAvatar } from "@/components/ui";
import { ListCard, ListCardButton } from "@/components/ui/list-card";
import { bookingTotal, type Booking } from "@/lib/api/bookings";
import type { PendingRating } from "@/lib/api/ratings";

type BookingExt = Booking & {
  tripId?: string;
  trip?: {
    id?: string;
    originCity?: string;
    destinationCity?: string;
    departureAt?: string;
    pricePerSeat?: number;
    driver?: { name?: string; avatarUrl?: string | null };
  };
};

const ACTIVE_STATUSES = new Set(["pending", "viewed", "accepted"]);

function fmtDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function PassengerCard({ booking, pendingRating, onRate, onCancel }: {
  booking: BookingExt;
  pendingRating?: PendingRating;
  onRate?: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("bookings");
  const router = useRouter();
  const trip = booking.trip;
  const tripId = booking.tripId ?? trip?.id;
  const status = booking.status as string;
  const active = ACTIVE_STATUSES.has(status);
  const driverName = trip?.driver?.name ?? t("driver_fallback");

  // История items are read-only (no chat/cancel); rating a finished trip stays.
  const actions = [
    active && (
      <ListCardButton
        key="chat"
        label={t("chat_btn")}
        icon={<MessageCircle className="h-4 w-4" />}
        kind="primary"
        onClick={() => router.push(`/my/bookings/${booking.id}/chat`)}
      />
    ),
    pendingRating && onRate && (
      <ListCardButton key="rate" label={t("rate_btn")} icon={<Star className="h-4 w-4" />} kind="primary" onClick={onRate} />
    ),
    onCancel && active && (
      <ListCardButton key="cancel" label={t("cancel_btn")} icon={<X className="h-4 w-4" />} kind="danger" onClick={onCancel} />
    ),
  ].filter(Boolean);

  return (
    <ListCard
      href={tripId ? `/trips/${tripId}` : undefined}
      when={fmtDate(trip?.departureAt)}
      status={status}
      origin={trip?.originCity ?? ""}
      destination={trip?.destinationCity ?? ""}
      avatar={<DriverAvatar name={driverName} src={trip?.driver?.avatarUrl} size="md" />}
      actorName={driverName}
      actorSub={<span className="text-[11.5px] font-700 text-ink-500">{booking.seatsCount} · {bookingTotal(booking, trip?.pricePerSeat) ?? "—"} {t("som")}</span>}
      actions={actions.length ? actions : undefined}
    />
  );
}
