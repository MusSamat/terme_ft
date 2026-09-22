"use client";

import { useTranslations } from "next-intl";
import { CarFront, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Role image (driver = person+wheel, passenger = person), tinted via CSS mask
// so it matches the segment/hint colour — same art as the role-switch loader.
function RoleIcon({ role, className }: { role: Intent; className?: string }) {
  const img = `url(/role-${role}.png)`;
  return (
    <span
      aria-hidden="true"
      className={cn("shrink-0", className)}
      style={{
        maskImage: img,
        WebkitMaskImage: img,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

// Role / intent switch — a segmented control with one sliding thumb in the
// active role colour (teal = passenger, grape = driver). Reads as a single
// control with a clear current state, not two rival cards. Optional `showHint`
// adds a one-line caption spelling out what the mode shows (used on the feed).
// Same public API as before. Used on the home/gate search and the create form.

export type Intent = "passenger" | "driver";

interface Props {
  value: Intent;
  onChange: (v: Intent) => void;
  className?: string;
  /** Feed-only caption that names the mode and what it shows. */
  showHint?: boolean;
}

export function IntentToggle({ value, onChange, className, showHint }: Props) {
  const t = useTranslations("feed");
  const driver = value === "driver";
  return (
    <div className={className}>
      <div className="relative grid grid-cols-2 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800">
        {/* sliding thumb — half width, slides to the active side */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-200 ease-out",
            driver
              ? "translate-x-full bg-grape-500 shadow-[0_4px_10px_-3px_rgba(99,102,241,.5)]"
              : "translate-x-0 bg-brand-600 shadow-[0_4px_10px_-3px_rgba(13,148,136,.5)]",
          )}
        />
        <button
          type="button"
          onClick={() => onChange("passenger")}
          aria-pressed={!driver}
          className={cn(
            "relative z-10 flex h-10 items-center justify-center gap-1.5 rounded-xl text-[14px] font-900 transition-colors",
            !driver ? "text-white" : "text-ink-500 dark:text-ink-400",
          )}
        >
          <RoleIcon role="passenger" className={cn("h-4 w-4", !driver ? "bg-white" : "bg-ink-500 dark:bg-ink-400")} />
          <span className="truncate">{t("mode_trips_title")}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("driver")}
          aria-pressed={driver}
          className={cn(
            "relative z-10 flex h-10 items-center justify-center gap-1.5 rounded-xl text-[14px] font-900 transition-colors",
            driver ? "text-white" : "text-ink-500 dark:text-ink-400",
          )}
        >
          <RoleIcon role="driver" className={cn("h-4 w-4", driver ? "bg-white" : "bg-ink-500 dark:bg-ink-400")} />
          <span className="truncate">{t("mode_requests_title")}</span>
        </button>
      </div>

      {showHint && (
        <div className="mt-2 flex items-center gap-1.5 px-1">
          {driver ? (
            <CarFront className="h-3.5 w-3.5 shrink-0 text-grape-600" aria-hidden="true" />
          ) : (
            <Search className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
          )}
          <span className="truncate text-[12.5px] font-700 text-ink-500 dark:text-ink-400">
            {driver
              ? `${t("mode_requests_title")} · ${t("mode_requests_hint")}`
              : `${t("mode_trips_title")} · ${t("mode_trips_hint")}`}
          </span>
        </div>
      )}
    </div>
  );
}
