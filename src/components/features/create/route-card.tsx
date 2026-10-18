"use client";

import { Circle, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { CityPickerField } from "@/components/ui/city-picker-field";
import { cn } from "@/lib/utils/cn";
import type { Place } from "@/lib/api/cities";
import type { RoutePlace } from "@/lib/places";

// Route card — design-spec §2.4: two input rows (circle / map-pin) inside a
// white card, leading icons tinted with the role accent (origin) / amber (dest).

interface Props {
  origin: RoutePlace | null;
  destination: RoutePlace | null;
  onOrigin: (v: Place) => void;
  onDestination: (v: Place) => void;
  iconAccent: string;
}

export function RouteCard({ origin, destination, onOrigin, onDestination, iconAccent }: Props) {
  const t = useTranslations("create");
  return (
    <div className="space-y-2.5 rounded-3xl bg-white p-4 shadow-card dark:bg-ink-900">
      <div className="flex items-center gap-2 rounded-2xl bg-ink-50 px-4 py-2.5 dark:bg-ink-800">
        <Circle className={cn("h-4 w-4 shrink-0", iconAccent)} aria-hidden="true" />
        <CityPickerField value={origin} onChange={onOrigin} placeholder={t("from_placeholder")} className="flex-1" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl bg-ink-50 px-4 py-2.5 dark:bg-ink-800">
        <MapPin className="h-4 w-4 shrink-0 text-accent-500" aria-hidden="true" />
        <CityPickerField value={destination} onChange={onDestination} placeholder={t("to_placeholder")} className="flex-1" />
      </div>
    </div>
  );
}
