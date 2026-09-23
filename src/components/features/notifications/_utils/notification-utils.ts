import { Star, Car, CheckCircle, AlertCircle, MessageCircle, Users, Clock } from "lucide-react";
import type { AppNotification } from "@/lib/api/notifications";
import type { Locale } from "@/i18n.config";
import { formatShortDate } from "@/lib/utils/date";

/** Minimal translator shape (next-intl's `useTranslations` return). */
type Translator = (key: string, values?: Record<string, string | number>) => string;

export const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  new_booking_request:            { icon: Car,           color: "text-brand-600" },
  booking_accepted:               { icon: CheckCircle,   color: "text-brand-600" },
  booking_request_confirmed:      { icon: CheckCircle,   color: "text-brand-600" },
  booking_rejected:               { icon: AlertCircle,   color: "text-coral-500"  },
  booking_expired:                { icon: AlertCircle,   color: "text-coral-500"  },
  booking_cancelled_by_passenger: { icon: AlertCircle,   color: "text-coral-500"  },
  booking_cancelled_by_driver:    { icon: AlertCircle,   color: "text-coral-500"  },
  trip_cancelled:                 { icon: Car,           color: "text-coral-500"  },
  trip_reminder:                  { icon: Clock,         color: "text-sky-600"  },
  trip_completed_rate:            { icon: Star,          color: "text-accent-500"},
  request_response_received:      { icon: Users,         color: "text-sky-600"  },
  request_response_accepted:      { icon: CheckCircle,   color: "text-brand-600" },
  request_response_declined:      { icon: AlertCircle,   color: "text-coral-500"  },
  request_cancelled_admin:        { icon: AlertCircle,   color: "text-coral-500"  },
  new_message:                    { icon: MessageCircle, color: "text-brand-600" },
  rating_received:                { icon: Star,          color: "text-accent-500"},
  rating_warning:                 { icon: AlertCircle,   color: "text-coral-500"  },
  verification_approved:          { icon: CheckCircle,   color: "text-brand-600" },
  verification_rejected:          { icon: AlertCircle,   color: "text-coral-500"  },
  verification_need_docs:         { icon: AlertCircle,   color: "text-accent-500"},
  account_blocked:                { icon: AlertCircle,   color: "text-coral-500"  },
  loyalty_tier_changed:           { icon: Star,          color: "text-accent-500"},
  security_alert_reuse:           { icon: AlertCircle,   color: "text-coral-500"  },
};

export const ACTION_TYPES = new Set([
  "new_booking_request",
  "booking_accepted",
  "booking_request_confirmed",
  "request_response_received",
  "request_response_accepted",
]);

/** Localized type label; falls back to the generic "notification" label. */
export function typeLabel(type: string, t: Translator): string {
  return type in TYPE_CONFIG ? t(`type_${type}`) : t("default_label");
}

function fmtTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${formatShortDate(iso, locale)}, ${time}`;
}

export function buildBody(notif: AppNotification, t: Translator, locale: Locale): string {
  const p = notif.payload as Record<string, unknown>;
  const str = (key: string) => (p[key] as string | undefined) ?? "";

  switch (notif.type) {
    case "new_booking_request": {
      const name = str("passengerName");
      const from = str("originCity");
      const to = str("destinationCity");
      const seats = p["seatsCount"] as number | undefined;
      return name
        ? t("body_new_booking_request", {
            name,
            route: from && to ? ` · ${from} → ${to}` : "",
            seats: seats ? t("seats_part", { n: seats }) : "",
          })
        : t("body_new_booking_request_fallback");
    }
    case "booking_accepted": {
      const booking = p["booking"] as Record<string, unknown> | undefined;
      const trip = booking?.["trip"] as Record<string, unknown> | undefined;
      const driver = trip?.["driver"] as Record<string, unknown> | undefined;
      const from = trip?.["originCity"] as string | undefined;
      const to = trip?.["destinationCity"] as string | undefined;
      const driverName = driver?.["name"] as string | undefined;
      return driverName
        ? t("body_booking_accepted", {
            name: driverName,
            route: from && to ? ` · ${from} → ${to}` : "",
          })
        : t("body_booking_accepted_fallback");
    }
    case "booking_request_confirmed": {
      const name = str("passengerName");
      return name
        ? t("body_booking_request_confirmed", { name })
        : t("body_booking_request_confirmed_fallback");
    }
    case "booking_rejected": {
      const booking = p["booking"] as Record<string, unknown> | undefined;
      const trip = booking?.["trip"] as Record<string, unknown> | undefined;
      const from = trip?.["originCity"] as string | undefined;
      const to = trip?.["destinationCity"] as string | undefined;
      return from && to
        ? t("body_booking_rejected", { route: ` · ${from} → ${to}` })
        : t("body_booking_rejected_fallback");
    }
    case "booking_expired":
      return t("body_booking_expired");
    case "booking_cancelled_by_passenger": {
      const booking = p["booking"] as Record<string, unknown> | undefined;
      const trip = booking?.["trip"] as Record<string, unknown> | undefined;
      const from = trip?.["originCity"] as string | undefined;
      const to = trip?.["destinationCity"] as string | undefined;
      return from && to
        ? t("body_booking_cancelled_by_passenger", { route: ` · ${from} → ${to}` })
        : t("body_booking_cancelled_by_passenger_fallback");
    }
    case "booking_cancelled_by_driver": {
      const booking = p["booking"] as Record<string, unknown> | undefined;
      const trip = booking?.["trip"] as Record<string, unknown> | undefined;
      const from = trip?.["originCity"] as string | undefined;
      const to = trip?.["destinationCity"] as string | undefined;
      return from && to
        ? t("body_booking_cancelled_by_driver", { route: ` · ${from} → ${to}` })
        : t("body_booking_cancelled_by_driver_fallback");
    }
    case "trip_cancelled": {
      const from = str("originCity");
      const to = str("destinationCity");
      return from && to
        ? t("body_trip_cancelled", { route: `${from} → ${to}` })
        : t("body_trip_cancelled_fallback");
    }
    case "trip_reminder": {
      const from = str("origin_city");
      const to = str("destination_city");
      const dep = str("departure_at");
      return from && to
        ? t("body_trip_reminder", {
            route: `${from} → ${to}`,
            time: dep ? ` · ${fmtTime(dep, locale)}` : "",
          })
        : t("body_trip_reminder_fallback");
    }
    case "request_response_received": {
      const name = str("driverName");
      const price = p["price"] as number | undefined;
      const dep = str("departureTime");
      return name
        ? t("body_request_response_received", {
            name,
            price: price ? t("price_part", { price }) : "",
            time: dep ? ` · ${fmtTime(dep, locale)}` : "",
          })
        : t("body_request_response_received_fallback");
    }
    case "request_response_accepted": {
      const name = str("passengerName");
      return name
        ? t("body_request_response_accepted", { name })
        : t("body_request_response_accepted_fallback");
    }
    case "request_response_declined":
      return t("body_request_response_declined");
    case "new_message": {
      const preview = str("preview");
      return preview ? t("body_new_message", { preview }) : t("body_new_message_fallback");
    }
    case "rating_received": {
      const rater = str("raterName");
      const score = p["score"] as number | undefined;
      return rater
        ? t("body_rating_received", { rater, score: score ? ` ★ ${score}` : "" })
        : t("body_rating_received_fallback");
    }
    case "rating_warning":
      return t("body_rating_warning", {
        rating: (p["rating"] as number | undefined)?.toFixed(1) ?? "< 4.0",
      });
    case "verification_approved":
      return t("body_verification_approved");
    case "verification_rejected":
      return str("reason") || t("body_verification_rejected");
    case "verification_need_docs": {
      const docs = (p["docs"] as string[] | undefined) ?? [];
      return docs.length
        ? t("body_verification_need_docs", { docs: docs.join(", ") })
        : t("body_verification_need_docs_fallback");
    }
    case "account_blocked":
      return str("reason") || t("body_account_blocked");
    case "loyalty_tier_changed":
      return str("tier")
        ? t("body_loyalty_tier_changed", { tier: str("tier") })
        : t("body_loyalty_tier_changed_fallback");
    case "security_alert_reuse":
      return t("body_security_alert_reuse");
    case "trip_completed_rate": {
      const from = str("origin_city");
      const to = str("destination_city");
      return from && to
        ? t("body_trip_completed_rate", { route: `${from} → ${to}` })
        : t("body_trip_completed_rate_fallback");
    }
    default:
      return t("default_label");
  }
}

export function buildDeepLink(notif: AppNotification): string | null {
  const p = notif.payload as Record<string, unknown>;
  const booking = p["booking"] as { id?: string } | undefined;

  switch (notif.type) {
    case "new_booking_request":
    case "booking_request_confirmed":
      return "/my/bookings";
    case "booking_accepted": {
      const id = booking?.id ?? (p["bookingId"] as string | undefined);
      return id ? `/my/bookings/${id}/chat` : "/my/bookings";
    }
    case "booking_rejected":
    case "booking_expired":
    case "booking_cancelled_by_passenger":
    case "booking_cancelled_by_driver":
      return "/my/bookings";
    case "trip_cancelled": {
      // Payload key style varies by emitter (DTO events camelCase, raw/cron
      // events snake_case) — accept both, fall back to the list.
      const tripId = (p["tripId"] ?? p["trip_id"]) as string | undefined;
      return tripId ? `/trips/${tripId}` : "/trips";
    }
    case "trip_reminder":
      return "/my/bookings";
    case "trip_completed_rate":
      return "/my/bookings";
    case "rating_received":
      return "/profile";
    case "new_message": {
      const msg = p["message"] as { bookingId?: string } | undefined;
      return msg?.bookingId ? `/my/bookings/${msg.bookingId}/chat` : "/my/bookings";
    }
    case "request_response_received":
    case "request_response_accepted":
    case "request_response_declined":
      return "/my/requests";
    case "verification_approved":
    case "verification_rejected":
    case "verification_need_docs":
      return "/profile/driver";
    default:
      return null;
  }
}
