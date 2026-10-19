"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MessageCircle, Check, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { markNotificationRead, type AppNotification } from "@/lib/api/notifications";
import { acceptBooking, getBooking, rejectBooking } from "@/lib/api/bookings";
import { Spinner } from "@/components/ui";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { toastError } from "@/components/layout/quick-toast";

type ActionResult = "accepted" | "rejected" | "error" | null;

const chatLinkClass = "inline-flex items-center gap-1.5 rounded-xl bg-ink-900 px-3 py-1.5 text-[13px] font-bold text-white dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100 hover:bg-ink-800";
const softLinkClass = "inline-flex items-center gap-1 text-[14px] font-semibold text-brand-700 hover:underline";

export function NotificationActions({ notification }: { notification: AppNotification }) {
  const t = useTranslations("notif_actions");
  const fe = useFriendlyError();
  const queryClient = useQueryClient();
  const p = notification.payload as Record<string, unknown>;
  const [result, setResult] = useState<ActionResult>(null);

  const bookingId = p["bookingId"] as string | undefined;
  const nestedBookingId = (p["booking"] as Record<string, unknown> | undefined)?.["id"] as string | undefined;
  const requestId = p["requestId"] as string | undefined;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  // Acting on the request also settles the notification itself — otherwise it
  // keeps hanging as "new" with live buttons after a reload.
  const settle = () => {
    if (!notification.readAt) void markNotificationRead(notification.id).catch(() => undefined);
    invalidate();
  };

  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: () => acceptBooking(bookingId!),
    onSuccess: () => { setResult("accepted"); settle(); },
    // A failed request (network, conflict) must not mark the notification read.
    onError: (e) => { setResult("error"); invalidate(); toastError(fe(extractError(e))); },
  });

  const { mutate: decline, isPending: declining } = useMutation({
    mutationFn: () => rejectBooking(bookingId!),
    onSuccess: () => { setResult("rejected"); settle(); },
    // A failed request (network, conflict) must not mark the notification read.
    onError: (e) => { setResult("error"); invalidate(); toastError(fe(extractError(e))); },
  });

  // Source of truth for the request card: the booking's CURRENT status — a
  // reload (or a decision made in Telegram) must not resurrect the buttons.
  const { data: liveBooking } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId!),
    // GET /bookings/:id marks it «viewed» for the driver — fetch only for
    // unread requests, not for every old row in the feed.
    enabled: notification.type === "new_booking_request" && Boolean(bookingId) && !notification.readAt,
    staleTime: 15_000,
  });

  switch (notification.type) {
    case "new_booking_request": {
      if (!bookingId) return null;
      const status = liveBooking?.status;
      if (result === "accepted" || status === "accepted") {
        return (
          <Link href={`/my/bookings/${bookingId}/chat`} className={chatLinkClass}>
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {t("open_chat")}
          </Link>
        );
      }
      if (result === "rejected" || status === "rejected") {
        return <span className="text-[14px] font-semibold text-ink-500">{t("booking_rejected")}</span>;
      }
      if (
        result === "error" ||
        (status && status !== "pending" && status !== "viewed") ||
        (!status && !result && notification.readAt)
      ) {
        // Cancelled / expired / unknown-decided — no actions, just a way in.
        return (
          <Link href={`/my/bookings`} className={softLinkClass}>
            {t("go_to_bookings")}
          </Link>
        );
      }
      return (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => accept()}
            disabled={accepting || declining}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink-900 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-ink-800 disabled:opacity-50 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
          >
            {accepting ? <Spinner size={12} /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            {t("accept")}
          </button>
          <button
            type="button"
            onClick={() => decline()}
            disabled={accepting || declining}
            className="inline-flex items-center gap-1.5 rounded-xl border border-danger-200 px-3 py-1.5 text-[13px] font-bold text-danger-600 hover:bg-danger-50 disabled:opacity-50"
          >
            {declining ? <Spinner size={12} /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
            {t("decline")}
          </button>
        </div>
      );
    }
    case "booking_accepted": {
      const id = nestedBookingId;
      if (!id) return null;
      return (
        <Link href={`/my/bookings/${id}/chat`} className={chatLinkClass}>
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {t("open_chat")}
        </Link>
      );
    }
    case "booking_request_confirmed": {
      const id = p["bookingId"] as string | undefined;
      if (!id) return null;
      return (
        <Link href={`/my/bookings/${id}/chat`} className={chatLinkClass}>
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {t("open_chat")}
        </Link>
      );
    }
    case "request_response_received": {
      return (
        <Link href={requestId ? `/my/requests` : "/my/requests"} className={softLinkClass}>
          {t("view_offers")}
        </Link>
      );
    }
    case "request_response_accepted": {
      if (!bookingId) return null;
      return (
        <Link href={`/my/bookings/${bookingId}/chat`} className={chatLinkClass}>
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {t("open_chat")}
        </Link>
      );
    }
    default:
      return null;
  }
}
