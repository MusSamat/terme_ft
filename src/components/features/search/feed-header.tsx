"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownUp, Circle, MapPin, SlidersHorizontal } from "lucide-react";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { Chip } from "@/components/ui/chip";
import { IntentToggle } from "./intent-toggle";
import { SmartDateNav } from "./smart-date-nav";
import { useAuth } from "@/store/auth";

// Mobile feed header — design-spec §2.2: map hero band + overlaid search
// card, «Найти поездку / Найти пассажира» segmented, filter chips row.

type FeedTab = "trips" | "requests";

/** Decorative dashed route over the map band (stroke #0D9488, teal→amber dots). */
function MapRoute() {
  return (
    <svg
      viewBox="0 0 340 128"
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden="true"
    >
      <path
        d="M30 100 C 100 96, 150 40, 220 44 S 300 24, 316 28"
        fill="none"
        stroke="#0D9488"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="1 10"
      />
      <circle cx="30" cy="100" r="6" fill="#0D9488" />
      <circle cx="316" cy="28" r="6" fill="#F59E0B" />
    </svg>
  );
}

interface FeedHeaderProps {
  tab: FeedTab;
  onOpenFilters: () => void;
}

export function FeedHeader({ tab, onOpenFilters }: FeedHeaderProps) {
  const t = useTranslations("feed");
  const router = useRouter();
  const pathname = usePathname();
  const setActiveMode = useAuth((s) => s.setActiveMode);
  const params = useSearchParams();

  const from = params.get("from") ?? params.get("from_city") ?? "";
  const to = params.get("to") ?? params.get("to_city") ?? "";

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("cursor");
    // Remember the last full route — prefills the search form on return.
    const nf = next.get("from");
    const nt = next.get("to");
    if (nf && nt) {
      try {
        localStorage.setItem("terme_last_route", JSON.stringify({ from: nf, to: nt }));
      } catch { /* ignore */ }
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const switchTab = (next: FeedTab) => {
    if (next === tab) return;
    // Unified home `/`: swap the feed in place by switching the active role —
    // the / page re-renders the other feed, keeping the route in the URL.
    if (pathname === "/") {
      setActiveMode(next === "requests" ? "driver" : "passenger");
      return;
    }
    // Legacy /trips ⇄ /requests routes: navigate, carrying the route.
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const query = qs.toString();
    router.push(`/${next}${query ? `?${query}` : ""}`);
  };

  return (
    <div>
      {/* Decorative map band */}
      <div
        className="h-24 w-full"
        style={{ background: "linear-gradient(135deg,#D0FBEF,#E0E7FF)" }}
      >
        <MapRoute />
      </div>

      {/* Role toggle FIRST, then the point inputs — pulled up over the band.
          focus-within raises this above the sticky filter bar (z-20) only while
          a city field is focused, so the autocomplete dropdown isn't covered by
          the «Фильтры» chip; when unfocused it drops back so the bar wins on scroll. */}
      <div className="relative z-10 -mt-9 space-y-2.5 px-4 pb-4 focus-within:z-30">
        <IntentToggle
          value={tab === "requests" ? "driver" : "passenger"}
          onChange={(v) => switchTab(v === "driver" ? "requests" : "trips")}
          showHint
        />
        <div className="rounded-2xl bg-white p-2 shadow-lift dark:bg-ink-900">
            <div className="flex items-center gap-2 pl-2">
              <Circle className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
              <CityAutocomplete
                borderless
                value={from}
                // Commit only a chosen city: typing emits "" per keystroke, and
                // dropping the param would kick the user back to route entry.
                onChange={(v) => { if (v) update({ from: v }); }}
                placeholder={t("from_placeholder")}
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => update({ from: to || null, to: from || null })}
                disabled={!from || !to}
                aria-label={t("swap_aria")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500 transition-colors disabled:opacity-40 dark:bg-ink-800 dark:text-ink-300"
              >
                <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="my-1 ml-6 border-t border-dashed border-ink-200 dark:border-ink-700" aria-hidden="true" />
            <div className="flex items-center gap-2 pl-2 pr-10">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-500" aria-hidden="true" />
              <CityAutocomplete
                borderless
                value={to}
                onChange={(v) => { if (v) update({ to: v }); }}
                placeholder={t("to_placeholder")}
                className="min-w-0 flex-1"
              />
            </div>
          </div>
        </div>

      {/* Sticky control bar: filters + date pill stay pinned while scrolling
          (the role toggle + route inputs above scroll away). */}
      <div className="sticky top-0 z-20 border-b border-ink-100 bg-ink-50/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/90">
        {/* Chips row: filters + the date stepper pill (‹ Сегодня · N ›) — a
            custom date lives in the filters sheet calendar. */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-3">
          <Chip
            kind="quick"
            selected
            accent="brand"
            icon={<SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={onOpenFilters}
          >
            {t("filters")}
          </Chip>
          <SmartDateNav kind={tab} />
        </div>
      </div>
    </div>
  );
}
