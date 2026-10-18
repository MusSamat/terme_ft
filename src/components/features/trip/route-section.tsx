"use client";

import { useLocale, useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { RouteMap, type MapPoint } from "@/components/map";
import { placeName, placeWithArea } from "@/lib/places";

type Named = { nameRu?: string; nameKg?: string };
type PlaceLike = Named & { lat?: number | null; lng?: number | null };
type PointLike = { lat: number; lng: number; address?: string | null; area?: Named | null };

interface Props {
  origin?: PlaceLike | null;
  destination?: PlaceLike | null;
  originPoint?: PointLike | null;
  destinationPoint?: PointLike | null;
  stops?: Array<{ place?: PlaceLike | null }>;
  /** «Где забирает водитель» vs «Где ждёт пассажир». */
  pickupLabel: string;
}

function toPoint(place: PlaceLike | null | undefined, pin: PointLike | null | undefined, label: string): MapPoint | null {
  if (pin) return { lat: pin.lat, lng: pin.lng, label };
  if (place?.lat != null && place?.lng != null) return { lat: place.lat, lng: place.lng, label };
  return null;
}

// Where exactly the ride starts (pin + жилмассив + landmark) and the route on a
// small map — the reason passengers in a big city can pick the nearest driver.
export function RouteSection({ origin, destination, originPoint, destinationPoint, stops = [], pickupLabel }: Props) {
  const t = useTranslations("detail");
  const locale = useLocale();
  const from = toPoint(origin, originPoint, placeWithArea(origin, originPoint?.area, locale));
  const to = toPoint(destination, destinationPoint, placeWithArea(destination, destinationPoint?.area, locale));
  const via = stops.flatMap((s) => {
    const p = toPoint(s.place, null, placeName(s.place, locale));
    return p ? [p] : [];
  });
  if (!from) return null;

  return (
    <div className="space-y-2">
      {originPoint && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-white p-3.5 ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[12px] font-800 uppercase tracking-wide text-ink-400">{pickupLabel}</p>
            <p className="text-[15px] font-800 text-ink-900 dark:text-white">
              {placeWithArea(origin, originPoint.area, locale)}
            </p>
            {originPoint.address && (
              <p className="text-[13.5px] font-600 text-ink-500 dark:text-ink-400">{originPoint.address}</p>
            )}
          </div>
        </div>
      )}
      <RouteMap origin={from} destination={to} stops={via} />
      {!originPoint && <p className="px-1 text-[12.5px] font-600 text-ink-400">{t("no_pin_hint")}</p>}
    </div>
  );
}
