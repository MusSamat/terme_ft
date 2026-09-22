"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownUp, Circle, MapPin, Search, X } from "lucide-react";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { OnlineBadge } from "@/components/ui/online-badge";
import { IntentToggle } from "./intent-toggle";
import { RideTypeToggle } from "./ride-type-toggle";
import { FeedEntryHints } from "./feed-entry-hints";
import { BecomeDriverBanner } from "@/components/features/driver/become-driver-banner";
import { addRecentRoute } from "@/lib/recent-routes";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils/cn";

// Search HUB (home `/`): the entry surface only — rails on top (destinations ·
// popular · history) and a docked search bar at the bottom (above the tab bar).
// Tapping the bar opens the search MODAL; submitting NAVIGATES to the results
// page (/trips or /requests). Results never render here — the hub stays a hub.

function readLastRoute(): { from: string; to: string } {
  try {
    const raw = localStorage.getItem("terme_last_route");
    if (raw) {
      const v = JSON.parse(raw) as { from?: string; to?: string };
      if (v.from && v.to) return { from: v.from, to: v.to };
    }
  } catch { /* ignore */ }
  return { from: "", to: "" };
}

export function SearchHub() {
  const t = useTranslations("feed");
  const router = useRouter();
  const driver = useAuth((s) => s.activeMode === "driver");
  const setActiveMode = useAuth((s) => s.setActiveMode);

  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [whole, setWhole] = useState(false);

  // Seed the last route so the docked bar shows where the user last searched.
  useEffect(() => {
    const r = readLastRoute();
    setFrom(r.from);
    setTo(r.to);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const go = (f: string, tt: string, wholeCabin: boolean) => {
    if (!f || !tt) return;
    addRecentRoute(f, tt);
    try {
      localStorage.setItem("terme_last_route", JSON.stringify({ from: f, to: tt }));
    } catch { /* ignore */ }
    const qs = new URLSearchParams();
    qs.set("from", f);
    qs.set("to", tt);
    if (wholeCabin) qs.set("seats", "4");
    setOpen(false);
    router.push(`/${driver ? "requests" : "trips"}?${qs.toString()}`);
  };

  const barLabel = from && to ? `${from} → ${to}` : t("hub_search_placeholder");

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <div className="px-4 pt-3 pb-[172px]">
        <div className="mb-3 flex items-center justify-end">
          <OnlineBadge className="bg-ink-50 dark:bg-ink-900" />
        </div>

        <IntentToggle
          value={driver ? "driver" : "passenger"}
          onChange={(v) => setActiveMode(v)}
          showHint
        />

        <div className="mt-4">
          <BecomeDriverBanner />
          <FeedEntryHints
            tab={driver ? "requests" : "trips"}
            onPick={(f, tt) => go(f, tt, whole)}
          />
        </div>
      </div>

      {/* Docked search bar — above the tab bar; taps open the search modal */}
      <div className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-[560px] px-4 md:bottom-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-3xl bg-white p-2.5 pl-4 text-left shadow-lift ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800"
        >
          <span className={cn("min-w-0 flex-1 truncate text-[15px] font-800", from && to ? "text-ink-900 dark:text-white" : "text-ink-400")}>
            {barLabel}
          </span>
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-accent-ink shadow-cta", driver ? "bg-grape-600 text-white shadow-indigocta" : "bg-accent-500")}>
            <Search className="h-5 w-5" aria-hidden="true" />
          </span>
        </button>
      </div>

      {/* Search modal */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
      )}
      <div
        className={`search-sheet sheet-nav-pad fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-t-4xl bg-white dark:bg-ink-900${open ? " open" : ""}`}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-[18px] font-900 text-ink-900 dark:text-white">
            {driver ? t("mode_requests_title") : t("mode_trips_title")}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("close")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-500 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 pb-6 pt-4">
          <div className="rounded-2xl bg-ink-50 p-1.5 dark:bg-ink-800/60">
            <div className="flex items-center gap-2.5 pl-2.5">
              <Circle className="h-3 w-3 shrink-0 fill-brand-600 text-brand-600" aria-hidden="true" />
              <CityAutocomplete
                borderless
                value={from}
                onChange={(v) => { if (v) setFrom(v); }}
                placeholder={t("from_placeholder")}
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => { setFrom(to); setTo(from); }}
                disabled={!from || !to}
                aria-label={t("swap_aria")}
                className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-ink-500 shadow-xs transition-colors disabled:opacity-40 dark:bg-ink-900 dark:text-ink-300"
              >
                <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="my-1 ml-[26px] border-t border-dashed border-ink-200 dark:border-ink-700" aria-hidden="true" />
            <div className="flex items-center gap-2.5 pl-2.5 pr-11">
              <MapPin className="h-3.5 w-3.5 shrink-0 fill-accent-500/20 text-accent-500" aria-hidden="true" />
              <CityAutocomplete
                borderless
                value={to}
                onChange={(v) => { if (v) setTo(v); }}
                placeholder={t("to_placeholder")}
                className="min-w-0 flex-1"
              />
            </div>
          </div>

          <div className="mt-3">
            <RideTypeToggle whole={whole} onChange={setWhole} accent={driver ? "grape" : "brand"} />
          </div>

          <button
            type="button"
            onClick={() => go(from, to, whole)}
            disabled={!from || !to}
            className={cn(
              "mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-900 shadow-cta transition-colors",
              from && to
                ? driver
                  ? "bg-grape-600 text-white shadow-indigocta hover:bg-grape-500"
                  : "bg-accent-500 text-accent-ink hover:bg-accent-400"
                : "cursor-not-allowed bg-ink-200 text-ink-400 shadow-none dark:bg-ink-800 dark:text-ink-500",
            )}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            {driver ? t("find_passenger") : t("find_trip")}
          </button>
        </div>
      </div>
    </div>
  );
}
