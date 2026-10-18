"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Shield, Users, Calendar, Zap, MessageCircle, CheckCircle, Pencil, X, Plane } from "lucide-react";
import { useTranslations } from "next-intl";
import { type PassengerRequest, cancelPassengerRequest } from "@/lib/api/passenger-requests";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { toastSuccess, toastError } from "@/components/layout/quick-toast";
import { DriverAvatar } from "@/components/ui/driver-avatar";
import { LikeButton } from "@/components/ui/like-button";
import { ListingMetrics } from "@/components/ui/listing-metrics";
import { ListingTypeBadge } from "@/components/ui/listing-type-badge";
import { SeatStack } from "@/components/ui/seat-meter";
import { useAuth } from "@/store/auth";
import { useRecordView } from "@/lib/hooks/use-record-view";
import { RespondModal } from "./_components/respond-modal";
import { ContactRevealButton } from "@/components/ui/contact-reveal-button";
import { useRouteNames } from "@/lib/hooks/use-route-names";
import { RouteSection } from "@/components/features/trip/route-section";

interface Props {
  request: PassengerRequest;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function RequestDetailPane({ request }: Props) {
  const rn = useRouteNames();
  const { passenger } = request;
  useRecordView("passenger_request", request.id);
  const t = useTranslations("requests");
  const tMy = useTranslations("requests.my");
  const tCard = useTranslations("card");
  const tToasts = useTranslations("toasts");
  const tFilters = useTranslations("request_filters");
  const tDetail = useTranslations("detail");
  const authStatus = useAuth((s) => s.status);
  const myId = useAuth((s) => s.user?.id);
  const router = useRouter();
  const qc = useQueryClient();
  const fe = useFriendlyError();
  const [showModal, setShowModal] = useState(false);
  const showRating = passenger.rating !== null && passenger.ratingCount >= 3;
  // The request owner never sees respond/call on their OWN request — only
  // edit / cancel (mirrors the Flutter owner-aware detail).
  const isOwner = Boolean(myId && request.passengerId === myId);
  // Phase 1: no roles — any signed-in user may respond (backend требует машину).
  const isDriver = authStatus === "authenticated" && !isOwner;
  const isGuest = authStatus === "anonymous" || authStatus === "idle";
  const isOpen = request.status === "open";

  const cancelMut = useMutation({
    mutationFn: () => cancelPassengerRequest(request.id),
    onSuccess: () => {
      toastSuccess(tToasts("request_cancelled"));
      void qc.invalidateQueries({ queryKey: ["passenger-requests"] });
      router.push("/my/bookings?tab=requests");
    },
    onError: (e) => toastError(fe(extractError(e))),
  });

  return (
    <>
      {/* Symmetric with the trip detail: scrollable body + sticky CTA footer so
          «Откликнуться»/«Позвонить» are always in view, above the bottom nav. */}
      <div className="flex flex-col">
      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        {/* Type + engagement: metrics (creator only, icons-only) + like */}
        <div className="flex items-center justify-between gap-2">
          <ListingTypeBadge type="request" />
          <div className="flex items-center gap-2">
            <ListingMetrics metrics={request.metrics} />
            {/* A closed/expired request is read-only — no liking it from history. */}
            {isOpen && !isOwner && <LikeButton targetType="passenger_request" id={request.id} liked={!!request.liked} />}
          </div>
        </div>

        {/* Passenger header */}
        <Link
          href={`/drivers/${passenger.id}`}
          className="flex items-center gap-3 rounded-2xl border border-grape-100 bg-grape-50 p-4 transition-colors hover:border-grape-200 hover:bg-grape-100"
        >
          <DriverAvatar
            name={passenger.name}
            src={passenger.avatarUrl}
            size="lg"
            className="ring-2 ring-grape-200"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-[20px] font-extrabold text-ink-900">{passenger.name}</p>
            {showRating ? (
              <div className="mt-0.5 flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${i <= Math.round(passenger.rating!) ? "fill-accent-400 text-accent-400" : "text-ink-300"}`}
                      aria-hidden
                    />
                  ))}
                </div>
                <span className="text-[14px] font-bold text-ink-900">
                  {passenger.rating!.toFixed(1)}
                </span>
                <span className="text-[13px] text-ink-500">
                  · {t("ratings_count", { n: passenger.ratingCount })}
                </span>
              </div>
            ) : (
              <span className="mt-0.5 text-[14px] font-semibold text-ink-500">
                {t("new_passenger")}
              </span>
            )}
          </div>
          <Shield className="h-4 w-4 flex-shrink-0 text-grape-400" aria-hidden />
        </Link>

        {/* Route */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">
            {tFilters("route_label")}
          </p>
          <div className="rounded-2xl border border-ink-100 bg-white p-4 dark:bg-ink-800 dark:border-ink-700">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-grape-500"
                  style={{ boxShadow: "0 0 0 3px #EDE9FE" }}
                  aria-hidden
                />
                <div className="my-1.5 h-10 w-0.5 bg-ink-200 dark:bg-ink-700" aria-hidden />
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-grape-400"
                  style={{ boxShadow: "0 0 0 3px #EDE9FE" }}
                  aria-hidden
                />
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div>
                  <p className="text-[17px] font-extrabold text-ink-900 dark:text-white">
                    {rn(request).from}
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-ink-500">
                    {t("origin_point")}
                  </p>
                </div>
                <div>
                  <p className="text-[17px] font-extrabold text-ink-900 dark:text-white">
                    {rn(request).to}
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-ink-500">
                    {t("dest_point")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <RouteSection
          origin={request.origin}
          destination={request.destination}
          originPoint={request.originPoint}
          destinationPoint={request.destinationPoint}
          pickupLabel={tDetail("wait_point")}
        />

        {request.flightNumber && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-sky-50 px-4 py-3 dark:bg-sky-500/10">
            <Plane className="h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
            <p className="text-[15px] font-800 text-sky-900 dark:text-sky-100">
              {t("flight")}: {request.flightNumber}
            </p>
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-2xl border border-ink-100 bg-white p-3 dark:bg-ink-800 dark:border-ink-700">
            <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-ink-400">
              <Calendar className="h-3 w-3" aria-hidden />
              {t("date_detail")}
            </div>
            <p className="text-[14px] font-bold text-ink-900 dark:text-white">{fmtDate(request.departureDate)}</p>
            {request.flexible && (
              <span className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-bold text-accent-700">
                <Zap className="h-2.5 w-2.5" aria-hidden />
                {t("flexible")}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 rounded-2xl border border-ink-100 bg-white p-3 dark:bg-ink-800 dark:border-ink-700">
            <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-ink-400">
              <Users className="h-3 w-3" aria-hidden />
              {t("seats_needed")}
            </div>
            <p className="text-[28px] font-extrabold text-grape-600">{request.seatsNeeded}</p>
            <SeatStack needed={Math.min(request.seatsNeeded, 4)} size={20} className="mt-0.5" />
          </div>
        </div>

        {/* Comment */}
        {request.comment && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">
              {t("passenger_comment")}
            </p>
            <div className="rounded-2xl bg-grape-50 px-4 py-3 text-[14px] leading-relaxed text-ink-700">
              «{request.comment}»
            </div>
          </div>
        )}
      </div>

        {/* CTA at the END — plain footer, not floating over the info. */}
        <div className="border-t border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
          {isOwner ? (
            isOpen ? (
              <div className="flex gap-2">
                <Link
                  href="/my/bookings?tab=requests"
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white text-[15px] font-bold text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  {tMy("edit")}
                </Link>
                <button
                  type="button"
                  onClick={() => cancelMut.mutate()}
                  disabled={cancelMut.isPending}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white text-[15px] font-bold text-coral-600 transition-colors hover:bg-coral-50 disabled:opacity-50 dark:border-coral-500/40 dark:bg-ink-900"
                >
                  <X className="h-4 w-4" aria-hidden />
                  {cancelMut.isPending ? "…" : tCard("cancel")}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 dark:bg-ink-800 dark:border-ink-700">
                <p className="text-[14px] font-semibold text-ink-500">{t("closed")}</p>
              </div>
            )
          ) : isGuest ? (
            <Link
              href="/auth/login"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-grape-600 text-[15px] font-bold text-white hover:bg-grape-700"
            >
              {t("login_to_respond")}
            </Link>
          ) : isDriver && request.myResponse ? (
            // Already responded → no duplicate; edit-resend or just show state.
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-grape-300 bg-grape-50 text-[15px] font-bold text-grape-700 transition-colors hover:bg-grape-100"
            >
              <CheckCircle className="h-4 w-4" aria-hidden />
              {t("responded_edit")}
            </button>
          ) : isDriver && isOpen ? (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-grape-500 text-[15px] font-bold text-white transition-colors hover:bg-grape-600"
            >
              <CheckCircle className="h-4 w-4" aria-hidden />
              {t("respond_btn")}
            </button>
          ) : isDriver && !isOpen ? (
            <div className="flex items-center justify-center rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 dark:bg-ink-800 dark:border-ink-700">
              <p className="text-[14px] font-semibold text-ink-500">{t("closed")}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 dark:bg-ink-800 dark:border-ink-700">
              <MessageCircle className="h-4 w-4 flex-shrink-0 text-ink-400" aria-hidden />
              <p className="text-[13px] text-ink-500">{t("switch_to_driver")}</p>
            </div>
          )}
          {/* Call-first: drivers can ring the passenger directly (audited). */}
          {isDriver && isOpen && (
            <ContactRevealButton target="request" id={request.id} className="mt-2" />
          )}
        </div>
      </div>

      {showModal && (
        <RespondModal request={request} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
