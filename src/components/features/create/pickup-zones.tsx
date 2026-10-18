"use client";

import { useState } from "react";
import { UserPlus, Flag, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Chip, CityAutocomplete, SectionLabel, OptionalTag } from "@/components/ui";
import type { ChipAccent } from "@/components/ui";
import { placeName, toRoutePlace, type RoutePlace } from "@/lib/places";
import { cn } from "@/lib/utils/cn";

// Pickup / drop-off places on the way (driver trips) — design-spec §2.4.
// Settlements from the directory; removable chip per place. Exact points
// inside a settlement are the separate map pin fields.

/** City picker add-widget. Remounts after each pick so the input clears. */
function AddCityInline({ points, onChange }: { points: RoutePlace[]; onChange: (v: RoutePlace[]) => void }) {
  const [nonce, setNonce] = useState(0);
  return (
    <div className="w-48">
      <CityAutocomplete
        key={nonce}
        value={null}
        onChange={(v) => {
          if (!v) return;
          if (!points.some((p) => p.id === v.id)) onChange([...points, toRoutePlace(v)]);
          setNonce((n) => n + 1);
        }}
        compact
      />
    </div>
  );
}

interface ZoneProps {
  bg: string;
  headerColor: string;
  headerIcon: "pickup" | "flag";
  headerLabel: string;
  addLabel: string;
  points: RoutePlace[];
  onChange: (v: RoutePlace[]) => void;
  chipAccent: ChipAccent;
}

function Zone({ bg, headerColor, headerIcon, headerLabel, addLabel, points, onChange, chipAccent }: ZoneProps) {
  const locale = useLocale();
  const [adding, setAdding] = useState(false);
  const Icon = headerIcon === "flag" ? Flag : UserPlus;
  return (
    <div className={cn("rounded-2xl p-3", bg)}>
      <div className={cn("mb-2 flex items-center gap-1.5 text-[13px] font-900", headerColor)}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {headerLabel}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {points.map((p) => (
          <Chip key={p.id ?? p.nameRu} kind="removable" onRemove={() => onChange(points.filter((x) => x !== p))}>
            {placeName(p, locale)}
          </Chip>
        ))}
        {points.length < 5 &&
          (adding ? (
            <AddCityInline points={points} onChange={onChange} />
          ) : (
            <Chip kind="add" accent={chipAccent} onClick={() => setAdding(true)}>
              {addLabel}
            </Chip>
          ))}
      </div>
    </div>
  );
}

interface Props {
  pickup: RoutePlace[];
  dropoff: RoutePlace[];
  onPickup: (v: RoutePlace[]) => void;
  onDropoff: (v: RoutePlace[]) => void;
}

export function PickupZones({ pickup, dropoff, onPickup, onDropoff }: Props) {
  const t = useTranslations("create");
  // Collapsed by default (optional block) — open automatically when it has data.
  const [open, setOpen] = useState(pickup.length > 0 || dropoff.length > 0);
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card dark:bg-ink-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <SectionLabel>{t("pickup_title_driver")}</SectionLabel>
        <OptionalTag />
        <ChevronDown
          className={cn("ml-auto h-4 w-4 shrink-0 text-ink-400 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <>
          <p className="mb-3 mt-1 text-[14px] font-700 text-ink-400">{t("pickup_hint_driver")}</p>
          <div className="space-y-2.5">
            <Zone
              bg="bg-brand-50 dark:bg-brand-500/10"
              headerColor="text-brand-700 dark:text-brand-300"
              headerIcon="pickup"
              headerLabel={t("pickup_from_driver")}
              addLabel={t("add_city")}
              points={pickup}
              onChange={onPickup}
              chipAccent="brand"
            />
            <Zone
              bg="bg-sky-50 dark:bg-sky-500/10"
              headerColor="text-sky-600 dark:text-sky-300"
              headerIcon="flag"
              headerLabel={t("dropoff_driver")}
              addLabel={t("add_city")}
              points={dropoff}
              onChange={onDropoff}
              chipAccent="sky"
            />
          </div>
        </>
      )}
    </div>
  );
}
