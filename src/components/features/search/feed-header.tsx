"use client";

import { useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownUp, Circle, MapPin, SlidersHorizontal, Search } from "lucide-react";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { OnlineBadge } from "@/components/ui/online-badge";
import { IntentToggle } from "./intent-toggle";
import { RideTypeToggle } from "./ride-type-toggle";
import { SmartDateNav } from "./smart-date-nav";
import { addRecentRoute } from "@/lib/recent-routes";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils/cn";

// Home search header (redesign — Yandex «Межгород» inspired): role segment on
// top, a compact points card (Откуда/Куда + swap), a ride-type segment
// (С попутчиками | Весь салон) with a filters icon, then a date pill + the
// primary CTA. Route-first: picking both cities reveals results below; the CTA
// re-affirms the search, records the recent route and scrolls to the results.

type FeedTab = "trips" | "requests";

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
  const rootRef = useRef<HTMLDivElement>(null);

  const from = params.get("from") ?? params.get("from_city") ?? "";
  const to = params.get("to") ?? params.get("to_city") ?? "";
  const hasRoute = Boolean(from && to);
  const whole = params.get("seats") === "4";
  const grape = tab === "requests";

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("cursor");
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
    // Unified home `/`: swap the feed in place by switching the active role.
    if (pathname === "/") {
      setActiveMode(next === "requests" ? "driver" : "passenger");
      return;
    }
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const query = qs.toString();
    router.push(`/${next}${query ? `?${query}` : ""}`);
  };

  // CTA: commit the search — save the recent route and scroll to the results
  // that render below the header (both cities already drive the feed query).
  const onSearch = () => {
    if (!hasRoute) return;
    addRecentRoute(from, to);
    const el = rootRef.current;
    if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight - 8, behavior: "smooth" });
  };

  return (
    <div ref={rootRef} className="px-4 pt-3">
      <div className="mb-2.5 flex items-center justify-end">
        <OnlineBadge className="bg-ink-50 dark:bg-ink-900" />
      </div>

      <IntentToggle
        value={grape ? "driver" : "passenger"}
        onChange={(v) => switchTab(v === "driver" ? "requests" : "trips")}
        showHint
      />

      {/* Search card — points, ride-type + filters, date + CTA */}
      <div className="mt-3 rounded-3xl bg-white p-3 shadow-lift dark:bg-ink-900">
        <div className="rounded-2xl bg-ink-50 p-1.5 dark:bg-ink-800/60">
          <div className="flex items-center gap-2.5 pl-2.5">
            <Circle className="h-3 w-3 shrink-0 fill-brand-600 text-brand-600" aria-hidden="true" />
            <CityAutocomplete
              borderless
              value={from}
              onChange={(v) => { if (v) update({ from: v }); }}
              placeholder={t("from_placeholder")}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => update({ from: to || null, to: from || null })}
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
              onChange={(v) => { if (v) update({ to: v }); }}
              placeholder={t("to_placeholder")}
              className="min-w-0 flex-1"
            />
          </div>
        </div>

        {/* Ride-type segment + filters icon */}
        <div className="mt-2.5 flex items-stretch gap-2">
          <RideTypeToggle
            whole={whole}
            onChange={(w) => update({ seats: w ? "4" : null })}
            accent={grape ? "grape" : "brand"}
          />
          <button
            type="button"
            onClick={onOpenFilters}
            aria-label={t("filters")}
            className="flex w-11 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-ink-600 transition-colors hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Date + primary CTA */}
        <div className="mt-2.5 flex items-center gap-2">
          {hasRoute ? (
            <SmartDateNav kind={tab} />
          ) : (
            <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-2xl border border-ink-200 bg-white px-3.5 text-[13px] font-800 text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200">
              {t("today")}
            </span>
          )}
          <button
            type="button"
            onClick={onSearch}
            disabled={!hasRoute}
            className={cn(
              "flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-900 text-accent-ink shadow-cta transition-colors",
              hasRoute ? "bg-accent-500 hover:bg-accent-400" : "cursor-not-allowed bg-ink-200 text-ink-400 shadow-none dark:bg-ink-800 dark:text-ink-500",
            )}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            {grape ? t("find_passenger") : t("find_trip")}
          </button>
        </div>
      </div>
    </div>
  );
}
