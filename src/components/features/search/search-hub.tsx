"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownUp, CalendarDays, Circle, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { DatePickerModal } from "@/components/ui/date-picker";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { OnlineBadge } from "@/components/ui/online-badge";
import { IntentToggle } from "./intent-toggle";
import { RideTypeToggle } from "./ride-type-toggle";
import { FeedEntryHints } from "./feed-entry-hints";
import { BecomeDriverBanner } from "@/components/features/driver/become-driver-banner";
import { addRecentRoute } from "@/lib/recent-routes";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils/cn";

// Home `/` — the search HUB. Rails on top (destinations · popular · history)
// then an in-flow search card (Откуда/Куда autocomplete) that sits above the
// footer. Search happens here; «Найти» NAVIGATES to the results page — /trips
// (passenger) or /requests (driver) — by role. Results never render here.

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

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [whole, setWhole] = useState(false);
  const [date, setDate] = useState(""); // "" = today
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const r = readLastRoute();
    setFrom(r.from);
    setTo(r.to);
  }, []);

  const today = new Date(Date.now() + 6 * 3_600_000).toISOString().slice(0, 10);

  // Submit → go to the results page for the active role (as before), carrying
  // the route + ride-type (+ date, + open-filters). Also used by the rails.
  const goRoute = (f: string, tt: string, wholeCabin: boolean, openFilters = false) => {
    if (!f || !tt) return;
    addRecentRoute(f, tt);
    try {
      localStorage.setItem("terme_last_route", JSON.stringify({ from: f, to: tt }));
    } catch { /* ignore */ }
    const qs = new URLSearchParams();
    qs.set("from", f);
    qs.set("to", tt);
    if (wholeCabin) qs.set("seats", "4");
    if (date && date !== today) qs.set("date", date);
    if (openFilters) qs.set("filters", "1");
    router.push(`/${driver ? "requests" : "trips"}?${qs.toString()}`);
  };

  const ready = Boolean(from && to);
  const dateLabel = !date || date === today ? t("today") : date;

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pb-[336px] md:pb-12">
        {/* Sticky role header — stays put while the rails scroll (web-mobile);
            plain in-flow on desktop. */}
        <div className="sticky top-0 z-20 -mx-4 bg-ink-50/95 px-4 pt-3 pb-2.5 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:pb-0 md:backdrop-blur-none dark:bg-ink-950/95 dark:md:bg-transparent">
          <div className="mb-2.5 flex items-center justify-end">
            <OnlineBadge className="bg-ink-50 dark:bg-ink-900" />
          </div>
          <IntentToggle value={driver ? "driver" : "passenger"} onChange={(v) => setActiveMode(v)} showHint />
        </div>

        <div className="mt-4">
          <BecomeDriverBanner />
          <FeedEntryHints
            tab={driver ? "requests" : "trips"}
            onPick={(f, tt) => goRoute(f, tt, whole)}
            onDestination={(city) => setTo(city)}
          />
        </div>

      {/* Search card — floats above the bottom-nav on mobile (footer hidden
          there) so it's always visible while the rails scroll behind it; on
          desktop it's in normal flow, above the footer. */}
      <div className="fixed inset-x-0 bottom-[calc(94px+env(safe-area-inset-bottom))] z-30 px-4 md:static md:bottom-auto md:mt-2 md:px-0">
      <div className="mx-auto max-w-[560px] rounded-3xl bg-white p-3 shadow-lift ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800 md:max-w-none">
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

          <div className="mt-2.5 flex items-stretch gap-2">
            <RideTypeToggle whole={whole} onChange={setWhole} accent={driver ? "grape" : "brand"} />
            <button
              type="button"
              onClick={() => goRoute(from, to, whole, true)}
              disabled={!ready}
              aria-label={t("filters")}
              className="flex w-11 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-ink-600 transition-colors hover:bg-ink-200 disabled:opacity-40 dark:bg-ink-800 dark:text-ink-300"
            >
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-ink-50 px-3.5 text-[13px] font-800 text-ink-800 dark:bg-ink-800/60 dark:text-ink-100"
            >
              <CalendarDays className="h-4 w-4 text-brand-500" aria-hidden="true" />
              {dateLabel}
            </button>
            <button
              type="button"
              onClick={() => goRoute(from, to, whole)}
              disabled={!ready}
              className={cn(
                "flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-900 transition-colors",
                ready
                  ? driver
                    ? "bg-grape-600 text-white shadow-indigocta hover:bg-grape-500"
                    : "bg-accent-500 text-accent-ink shadow-cta hover:bg-accent-400"
                  : "cursor-not-allowed bg-ink-200 text-ink-400 dark:bg-ink-800 dark:text-ink-500",
              )}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              {driver ? t("find_passenger") : t("find_trip")}
            </button>
          </div>
        </div>
      </div>

      <DatePickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={date}
        onChange={(v) => setDate(v)}
        min={today}
        title={t("pick_date")}
      />
    </div>
  );
}
