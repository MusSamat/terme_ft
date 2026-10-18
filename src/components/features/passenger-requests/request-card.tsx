"use client";

import Link from "next/link";
import { memo } from "react";
import { CalendarClock, ChevronRight, Star } from "lucide-react";
import { ContactRevealButton } from "@/components/ui/contact-reveal-button";
import { useAuth } from "@/store/auth";
import { useLocale, useTranslations } from "next-intl";
import type { PassengerRequestCardItem } from "@/lib/api/passenger-requests";
import { DriverAvatar } from "@/components/ui/driver-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils/cn";
import { useRouteNames } from "@/lib/hooks/use-route-names";
import { placeName } from "@/lib/places";

// Passenger-request card — grape ticket variant of TripCard. A grape-tinted
// tile split by a dashed perforation: top half = the request (date · route ·
// seats needed), bottom stub = the passenger. One trust signal only (rating OR
// «Новый»); the whole card is tappable. The form holds the shape — no shadow.

interface RequestCardProps {
  request: PassengerRequestCardItem;
  href?: string;
  className?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  cancelLoading?: boolean;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function RequestCardInner({
  request,
  href,
  className,
  onClick,
  onEdit,
  onCancel,
  cancelLoading,
}: RequestCardProps) {
  const rn = useRouteNames();
  const locale = useLocale();
  const tc = useTranslations("card");
  const t = useTranslations("card");
  const { passenger } = request;
  // Own-post check by user id (metrics is not a reliable ownership signal).
  const myId = useAuth((s) => s.user?.id);
  const isOwn = Boolean(myId && request.passengerId === myId);
  const showRating = passenger.rating !== null && passenger.ratingCount >= 3;
  const isOpen = request.status === "open";

  const content = (
    <article
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[18px] bg-white px-3.5 pb-3 pt-3.5 shadow-card ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-lift",
        "[--notch:#FAFAF9] [--perf-line:#E7E5E4] dark:bg-[#232322] dark:shadow-none dark:ring-0 dark:[--notch:#0C0A09] dark:[--perf-line:#3C3C3A]",
        !isOpen && "opacity-50",
        request.myResponse && "bg-emerald-50/60 ring-emerald-200 dark:bg-emerald-500/[0.07] dark:ring-emerald-500/25",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {/* Top half — date (hero) · route · seats needed */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 shrink-0 text-grape-600 dark:text-grape-300" aria-hidden="true" />
            <span className="num truncate text-[17px] font-800 leading-tight text-ink-900 dark:text-ink-50">
              {fmtDate(request.departureDate)}
              {request.flexible && ` · ${t("flexible")}`}
            </span>
            {request.myResponse && (
              <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-900 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                {t("responded")}
              </span>
            )}
          </div>
          <div className="mt-1.5 truncate text-[14px] font-700 text-ink-500 dark:text-ink-400">
            {rn(request).from}
            {request.originPoint?.area && ` · ${placeName(request.originPoint.area, locale)}`} → {rn(request).to}
          </div>
          {(typeof request.distanceKm === "number" || request.flightNumber) && (
            <div className="mt-0.5 truncate text-[11.5px] font-800 text-grape-600 dark:text-grape-300">
              {typeof request.distanceKm === "number" &&
                tc("distance_from_you", { km: request.distanceKm.toLocaleString(locale === "kg" ? "ky-KG" : "ru-RU") })}
              {typeof request.distanceKm === "number" && request.flightNumber ? " · " : ""}
              {request.flightNumber && `✈️ ${request.flightNumber}`}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="num text-[19px] font-800 leading-none text-grape-600 dark:text-grape-300">
            {request.seatsNeeded}
          </div>
          <div className="mt-1 text-[11px] font-600 text-ink-500 dark:text-ink-400">{t("needs")}</div>
        </div>
      </div>

      {/* Perforation → passenger stub */}
      <div className="ticket-perf mt-3" aria-hidden="true" />

      {/* Bottom stub — avatar · name · rating|«Новый» …· contact · chevron */}
      <div className="flex items-center gap-2 pt-3">
        <DriverAvatar name={passenger.name} src={passenger.avatarUrl} size="sm" shape="square" />
        <span className="shrink-0 truncate text-[13px] font-800 text-ink-900 dark:text-ink-50">
          {passenger.name.split(" ")[0]}
        </span>
        {showRating ? (
          <span className="num flex shrink-0 items-center gap-0.5 text-[12px] font-700 text-ink-500 dark:text-ink-400">
            <Star className="h-3 w-3 fill-accent-400 text-accent-400" aria-hidden="true" />
            {passenger.rating!.toFixed(1)}
          </span>
        ) : (
          <span className="shrink-0 rounded-md bg-grape-50 px-1.5 py-0.5 text-[11px] font-800 text-grape-600 dark:bg-grape-500/25 dark:text-grape-200">
            {t("new")}
          </span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-2">
          {!isOpen && <StatusBadge status={request.status} className="shrink-0" />}
          {/* Call-first: one tap → number + dialer. Never on own requests. */}
          {!isOwn && isOpen && (
            <ContactRevealButton variant="icon" target="request" id={request.id} />
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-grape-400" aria-hidden="true" />
        </span>
      </div>

      {/* Owner actions (own list only): edit (compact) + cancel (prominent). */}
      {onCancel && isOpen && (
        <div className="mt-2.5 flex gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="shrink-0 rounded-xl bg-ink-100 px-4 py-2 text-[14px] font-900 text-ink-600 transition-colors hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
            >
              {t("edit")}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
            disabled={cancelLoading}
            className="flex-1 rounded-xl bg-danger-50 py-2 text-[14px] font-900 text-danger-600 transition-colors hover:bg-danger-100 disabled:opacity-40 dark:bg-danger-500/10 dark:hover:bg-danger-500/20"
          >
            {cancelLoading ? "…" : t("cancel")}
          </button>
        </div>
      )}
    </article>
  );

  if (href && !onClick) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}

export const RequestCard = memo(RequestCardInner);
