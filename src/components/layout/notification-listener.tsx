"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { getSocket } from "@/lib/socket/client";
import { useAuth } from "@/store/auth";
import { getMe } from "@/lib/api/auth";
import { pushToast } from "@/components/layout/quick-toast";

export function NotificationListener() {
  const isAuthenticated = useAuth((s) => s.status === "authenticated");
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const t = useTranslations("notif_toast");

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();

    const invalidateNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const invalidateBookings = () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      // «Мои» posts show seat counts that bookings change.
      void queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      // singular detail query used by the open chat screen — without this the
      // pre-booking banner/template mode survives an acceptance that happens
      // while the chat is on screen (stale status, staleTime 30s)
      void queryClient.invalidateQueries({ queryKey: ["booking"] });
    };

    const onNewMessage = (data: { message?: { bookingId?: string; text?: string } }) => {
      void queryClient.invalidateQueries({ queryKey: ["chat", "summaries"] });
      const bookingId = data?.message?.bookingId;
      const chatPath = bookingId ? `/my/bookings/${bookingId}/chat` : null;
      if (chatPath && !pathname.startsWith(chatPath)) {
        pushToast({
          type: "chat_message",
          title: t("new_message_title"),
          body: data.message?.text?.slice(0, 80) ?? "",
        });
      }
    };

    const onBookingNewRequest = (data: {
      booking: { id: string; seatsCount: number };
      trip: { originCity: string; destinationCity: string };
      passengerName: string;
      passengerRating: number | null;
    }) => {
      invalidateBookings();
      invalidateNotifications();
      const { passengerName, trip } = data;
      pushToast({
        type: "booking_request",
        title: t("new_request_title"),
        body: passengerName
          ? t("new_request_body", {
              name: passengerName,
              from: trip.originCity,
              to: trip.destinationCity,
            })
          : `${trip.originCity} → ${trip.destinationCity}`,
      });
    };

    const onBookingAccepted = () => {
      invalidateBookings();
      invalidateNotifications();
      pushToast({ type: "booking_accepted", title: t("accepted_title"), body: t("accepted_body") });
    };

    const onBookingRequestConfirmed = (data: { passengerName?: string }) => {
      invalidateBookings();
      invalidateNotifications();
      const name = data?.passengerName;
      pushToast({
        type: "booking_accepted",
        title: t("accepted_title"),
        body: name ? t("confirmed_body", { name }) : t("confirmed_body_fallback"),
      });
    };

    const onBookingRejected = () => {
      invalidateBookings();
      invalidateNotifications();
      pushToast({ type: "booking_rejected", title: t("rejected_title"), body: t("rejected_body") });
    };

    const onBookingCancelled = (data: { cancelledBy?: "driver" | "passenger" }) => {
      invalidateBookings();
      invalidateNotifications();
      const body = data?.cancelledBy === "driver"
        ? t("cancelled_body_driver")
        : t("cancelled_body");
      pushToast({ type: "booking_cancelled", title: t("cancelled_title"), body });
    };

    const onBookingExpired = () => {
      invalidateBookings();
      invalidateNotifications();
      pushToast({ type: "booking_expired", title: t("expired_title"), body: t("expired_body") });
    };

    // Payload: { trip: { id, originCity, destinationCity }, … }.
    const onTripCancelled = (data: { trip?: { originCity?: string; destinationCity?: string } }) => {
      invalidateBookings();
      invalidateNotifications();
      const route = data?.trip?.originCity && data?.trip?.destinationCity
        ? `${data.trip.originCity} → ${data.trip.destinationCity}`
        : null;
      pushToast({
        type: "booking_cancelled",
        title: t("trip_cancelled_title"),
        body: t("trip_cancelled_body", { route: route ? ` · ${route}` : "" }),
      });
    };

    const onRequestResponseReceived = (data: { driverName?: string; price?: number }) => {
      void queryClient.invalidateQueries({ queryKey: ["request-responses"] });
      void queryClient.invalidateQueries({ queryKey: ["passenger-requests"] });
      invalidateNotifications();
      const { driverName, price } = data ?? {};
      pushToast({
        type: "booking_request",
        title: t("offer_title"),
        body: driverName
          ? t("offer_body", { name: driverName, price: price ? t("offer_price", { price }) : "" })
          : t("offer_body_fallback"),
      });
    };

    const onRequestResponseAccepted = (data: { passengerName?: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["request-responses"] });
      invalidateBookings();
      invalidateNotifications();
      const name = data?.passengerName;
      pushToast({
        type: "booking_accepted",
        title: t("offer_accepted_title"),
        body: name ? t("offer_accepted_body", { name }) : t("offer_accepted_body_fallback"),
      });
    };

    const onRequestResponseDeclined = () => {
      void queryClient.invalidateQueries({ queryKey: ["request-responses"] });
      invalidateNotifications();
      pushToast({
        type: "booking_rejected",
        title: t("offer_declined_title"),
        body: t("offer_declined_body"),
      });
    };

    // Verification decided by moderation → refresh the driver status + roles
    // (otherwise the profile keeps «Стать водителем» until a reload).
    const onNotification = (data?: { type?: string }) => {
      invalidateNotifications();
      if (data?.type?.startsWith("verification_")) {
        void queryClient.invalidateQueries({ queryKey: ["driver-status"] });
        getMe()
          .then((u) => useAuth.getState().hydrate(u))
          .catch(() => undefined);
      }
    };

    // Driver saw the request → passenger's list shows «просмотрено» live.
    const onBookingViewed = () => invalidateBookings();

    // Trip completed → «оцените поездку» prompts refresh without a reload.
    const onTripCompletedRate = () => {
      void queryClient.invalidateQueries({ queryKey: ["ratings", "pending"] });
      invalidateNotifications();
    };

    // Booking phase flipped (accept/complete) while chat may be open —
    // refresh the booking detail the chat screen renders from.
    const onChatPhaseChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ["booking"] });
      void queryClient.invalidateQueries({ queryKey: ["chat", "summaries"] });
    };

    // A dropped connection (tunnel restart, backgrounded WebView, network
    // blip) loses any fire-and-forget booking/notification events emitted
    // while disconnected — resync everything once the socket comes back.
    const onReconnect = () => {
      invalidateBookings();
      invalidateNotifications();
      void queryClient.invalidateQueries({ queryKey: ["request-responses"] });
      void queryClient.invalidateQueries({ queryKey: ["passenger-requests"] });
    };

    socket.on("connect", onReconnect);
    socket.on("notification:new", onNotification);
    socket.on("booking:new_request", onBookingNewRequest);
    socket.on("booking:accepted", onBookingAccepted);
    socket.on("booking:request_confirmed", onBookingRequestConfirmed);
    socket.on("booking:rejected", onBookingRejected);
    socket.on("booking:cancelled", onBookingCancelled);
    socket.on("booking:expired", onBookingExpired);
    socket.on("trip:cancelled", onTripCancelled);
    socket.on("booking:viewed", onBookingViewed);
    socket.on("trip:completed_rate", onTripCompletedRate);
    socket.on("chat:phase_changed", onChatPhaseChanged);
    socket.on("chat:message", onNewMessage);
    socket.on("request:response_received", onRequestResponseReceived);
    socket.on("request:response_accepted", onRequestResponseAccepted);
    socket.on("request:response_declined", onRequestResponseDeclined);

    return () => {
      socket.off("connect", onReconnect);
      socket.off("notification:new", onNotification);
      socket.off("booking:new_request", onBookingNewRequest);
      socket.off("booking:accepted", onBookingAccepted);
      socket.off("booking:request_confirmed", onBookingRequestConfirmed);
      socket.off("booking:rejected", onBookingRejected);
      socket.off("booking:cancelled", onBookingCancelled);
      socket.off("booking:expired", onBookingExpired);
      socket.off("trip:cancelled", onTripCancelled);
      socket.off("booking:viewed", onBookingViewed);
      socket.off("trip:completed_rate", onTripCompletedRate);
      socket.off("chat:phase_changed", onChatPhaseChanged);
      socket.off("chat:message", onNewMessage);
      socket.off("request:response_received", onRequestResponseReceived);
      socket.off("request:response_accepted", onRequestResponseAccepted);
      socket.off("request:response_declined", onRequestResponseDeclined);
    };
  }, [isAuthenticated, queryClient, pathname, t]);

  return null;
}
