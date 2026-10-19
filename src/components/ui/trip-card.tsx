"use client";

import Link from "next/link";
import { Sofa, Star, Users, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef } from "react";
import type { Locale } from "@/i18n.config";
import type { TripCardItem } from "@/lib/api/trips";
import { usePrefetchTrip } from "@/lib/hooks/use-prefetch-trip";
import { formatDepartureLabel } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { StatusBadge } from "./status-badge";
import { DriverAvatar } from "./driver-avatar";
import { useRouteNames } from "@/lib/hooks/use-route-names";
import { placeName } from "@/lib/places";

// Ride card — ticket redesign (Terme Ticket Card.html). A filled sage tile
// split by a dashed perforation with edge notches: top half = the trip (time ·
// route spine · price), bottom stub = the driver. No date under the time (it's
// in the filter bar), no «Подробнее» hint (the whole card is tappable), one
// trust signal only (rating OR «Новый»). The form holds the shape — no shadow.

interface TripCardProps {
  trip: TripCardItem;
  href?: string;
  className?: string;
  active?: boolean;
  onClick?: () => void;
  /** «Мгновенно» badge — pass when the trip supports instant booking */
  instant?: boolean;
  /** «Весь салон» badge + sofa amenity */
  wholeCabin?: boolean;
  /** Viewer already has an active booking on this trip → show a badge. */
  booked?: boolean;
}

function TripCardInner({
  trip,
  href,
  className,
  active,
  onClick,
  instant,
  wholeCabin,
  booked,
}: TripCardProps) {
  const rn = useRouteNames();
  const t = useTranslations("card");
  const locale = useLocale() as Locale;

  // Prefetch the detail on hover (desktop) or when the card scrolls into view
  // (mobile). Guarded once per card; staleTime dedupes.
  const prefetch = usePrefetchTrip();
  const cardRef = useRef<HTMLElement>(null);
  const prefetchedRef = useRef(false);
  const doPrefetch = useCallback(() => {
    if (prefetchedRef.current || !trip.id) return;
    prefetchedRef.current = true;
    prefetch(trip.id);
  }, [prefetch, trip.id]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || prefetchedRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          doPrefetch();
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [doPrefetch]);
  const driver = trip.driver ?? {};
  const driverName = driver.name ?? "";
  const rating = driver.rating ?? null;
  const ratingCount = driver.ratingCount ?? 0;
  const seatsAvailable = trip.seatsAvailable ?? 0;
  const price = trip.pricePerSeat ?? 0;
  const stops = trip.pickupCities?.length ? trip.pickupCities.join(" · ") : null;
  // Inside a big city the pin's жилмассив tells passengers where exactly.
  const area = trip.originPoint?.area ? placeName(trip.originPoint.area, locale) : null;
  const distance = typeof trip.distanceKm === "number" ? trip.distanceKm : null;
  const car = driver.car ?? null;

  // «Сегодня, 06:00» → time hero «06:00» only. The date lives in the filter
  // bar, so repeating it on every row is noise. Window end renders as a small
  // suffix next to the hero time.
  const label = trip.departureAt ? formatDepartureLabel(trip.departureAt, locale) : "";
  const sep = label.lastIndexOf(", ");
  const timeLabel = sep > -1 ? label.slice(sep + 2) : label;
  let windowEnd = "";
  if (timeLabel && trip.departureWindowEnd) {
    const end = new Date(trip.departureWindowEnd);
    windowEnd = `–${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  }

  const soldOut = seatsAvailable === 0;
  const inactive = Boolean(trip.status && trip.status !== "active");

  const content = (
    <article
      ref={cardRef}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[18px] bg-white px-3.5 pb-3 pt-3.5 shadow-card ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-lift",
        "[--notch:#FAFAF9] [--perf-line:#E7E5E4] dark:bg-[#232322] dark:shadow-none dark:ring-0 dark:[--notch:#0C0A09] dark:[--perf-line:#3C3C3A]",
        (soldOut || inactive) && "opacity-45",
        active && "ring-2 ring-brand-500",
        booked && "bg-brand-50/60 ring-brand-200 dark:bg-brand-500/[0.07] dark:ring-brand-500/25",
        className,
      )}
      onClick={onClick}
      onPointerEnter={doPrefetch}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {/* Row 0 — only when the trip left the active state («Мои» lists) */}
      {inactive && trip.status && (
        <div className="mb-2 flex items-center gap-1.5">
          <StatusBadge status={trip.status} className="shrink-0" />
        </div>
      )}

      {/* Top half — big departure time · route spine · cities · price */}
      <div className="flex items-start gap-3">
        <p className="num w-[56px] shrink-0 whitespace-nowrap text-[20px] font-800 leading-none text-ink-900 dark:text-ink-50">
          {timeLabel}
          {windowEnd && (
            <span className="block pt-0.5 text-[11px] font-600 text-ink-500 dark:text-ink-400">{windowEnd}</span>
          )}
        </p>
        <div className="flex shrink-0 flex-col items-center self-stretch pt-1" aria-hidden="true">
          <span className="h-[7px] w-[7px] rounded-full border-[1.5px] border-brand-700 dark:border-brand-300" />
          <span className="my-1 w-px flex-1 bg-ink-300 dark:bg-white/15" />
          <span className="h-[7px] w-[7px] rounded-full bg-accent-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-800 leading-tight text-ink-900 dark:text-ink-50">
            {rn(trip).from}
            {area && <span className="font-700 text-ink-500 dark:text-ink-400"> · {area}</span>}
          </p>
          {distance !== null && (
            <p className="mt-0.5 truncate text-[11px] font-800 text-brand-700 dark:text-brand-300">
              {t("distance_from_you", { km: distance.toLocaleString(locale === "kg" ? "ky-KG" : "ru-RU") })}
            </p>
          )}
          {stops && (
            <p className="mt-0.5 truncate text-[11px] font-600 text-ink-500 dark:text-ink-400">{t("via", { stops })}</p>
          )}
          <p className="mt-1.5 truncate text-[15px] font-800 leading-tight text-ink-900 dark:text-ink-50">
            {rn(trip).to}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num whitespace-nowrap text-[19px] font-800 leading-none text-brand-900 dark:text-brand-300">
            {price.toLocaleString("ru-RU")}
            <span className="text-[12px] font-700">{t("som")}</span>
          </p>
          <p className="mt-1 text-[11px] font-600 text-ink-500 dark:text-ink-400">{t("per_seat")}</p>
        </div>
      </div>

      {/* Perforation → driver stub */}
      <div className="ticket-perf mt-3" aria-hidden="true" />

      {/* Bottom stub — avatar · [name · rating|«Новый» / full car name] · ⚡ · seats */}
      <div className="flex items-center gap-2 pt-3">
        <DriverAvatar name={driverName} src={driver.avatarUrl ?? null} size="sm" />
        {/* Name + trust on line 1; the full car name on its own line so it
            never truncates to «Nissa…». */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-800 text-ink-900 dark:text-ink-50">{driverName}</span>
            {rating !== null && ratingCount >= 3 ? (
              <span className="num flex shrink-0 items-center gap-0.5 text-[12px] font-700 text-ink-500 dark:text-ink-400">
                <Star className="h-3 w-3 fill-accent-400 text-accent-400" aria-hidden="true" />
                {rating.toFixed(1)}
              </span>
            ) : (
              <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-800 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                {t("new")}
              </span>
            )}
          </div>
          {car && (car.make || car.model) && (
            <p className="mt-0.5 truncate text-[12px] font-600 text-ink-500 dark:text-ink-400">
              {[car.make, car.model].filter(Boolean).join(" ")}
            </p>
          )}
        </div>

        <span className="flex shrink-0 items-center gap-2">
          {instant && <Zap className="h-4 w-4 fill-accent-400 text-accent-500" aria-hidden="true" />}
          {wholeCabin && <Sofa className="h-4 w-4 text-brand-500" aria-hidden="true" />}
          {soldOut ? (
            <span className="text-[12px] font-700 text-ink-500 dark:text-ink-400">{t("no_seats")}</span>
          ) : (
            <span
              className={cn(
                "num flex items-center gap-1 text-[12px] font-800",
                seatsAvailable === 1
                  ? "text-accent-500"
                  : "text-brand-800 dark:text-brand-300",
              )}
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {seatsAvailable}
            </span>
          )}
        </span>
      </div>
    </article>
  );

  if (href && !onClick) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}

export const TripCard = memo(TripCardInner);
