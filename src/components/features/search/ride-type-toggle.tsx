"use client";

import { useTranslations } from "next-intl";
import { Users, CarFront } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Ride-type segment (Yandex «Межгород» style): С попутчиками | Весь салон.
// Maps to the trips search `seats` param — shared = 1 (default, no filter),
// whole cabin = 4 (find rides with the whole car free). Grows to fill the row;
// a filters icon sits next to it in the header.

export function RideTypeToggle({
  whole,
  onChange,
  accent = "brand",
}: {
  whole: boolean;
  onChange: (whole: boolean) => void;
  accent?: "brand" | "grape";
}) {
  const t = useTranslations("feed");
  const onTone =
    accent === "grape" ? "text-grape-600 dark:text-grape-300" : "text-brand-600 dark:text-brand-300";

  const seg = (active: boolean, label: string, icon: React.ReactNode, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-[12.5px] font-800 transition-colors",
        active ? cn("bg-white shadow-xs dark:bg-ink-900", onTone) : "text-ink-500 dark:text-ink-400",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="grid flex-1 grid-cols-2 gap-1.5 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800">
      {seg(!whole, t("ride_shared"), <Users className="h-4 w-4 shrink-0" aria-hidden="true" />, () => onChange(false))}
      {seg(whole, t("ride_whole"), <CarFront className="h-4 w-4 shrink-0" aria-hidden="true" />, () => onChange(true))}
    </div>
  );
}
