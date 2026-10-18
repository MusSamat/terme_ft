"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, ShieldCheck, UserCheck, CigaretteOff, PawPrint, type LucideIcon } from "lucide-react";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { DatePicker } from "@/components/ui/date-picker";
import { Chip } from "@/components/ui/chip";
import { SectionLabel } from "@/components/ui/section-label";
import { Switch } from "@/components/ui/switch";
import { useCalendarCounts } from "@/lib/hooks/use-calendar-counts";
import { getCurrentPoint } from "@/lib/hooks/use-geolocation";
import { routeFromParams, setRouteParams, toRoutePlace, type RoutePlace } from "@/lib/places";

// Kyrgyzstan is fixed UTC+6 — anchor «Сегодня/Завтра» to the local calendar day.
function ymdKg(offsetDays = 0) {
  return new Date(Date.now() + 6 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}
function todayYMD() { return ymdKg(0); }
function isCustomDate(v: string) { return /^\d{4}-\d{2}-\d{2}$/.test(v); }

const PRICE_INPUT =
  "h-9 w-full rounded-xl border border-ink-200 bg-white px-3 text-[14px] font-800 text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";

export function FiltersBody() {
  const t = useTranslations("search_filters");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [geoDenied, setGeoDenied] = useState(false);

  const SORT_OPTIONS = [
    { value: "time",        label: t("sort_time") },
    { value: "price_asc",   label: t("sort_price_asc") },
    { value: "rating_desc", label: t("sort_rating_desc") },
    { value: "nearest",     label: t("sort_nearest") },
  ] as const;

  // Real YYYY-MM-DD values — the API validates dates, symbolic tokens 400.
  const DATE_CHIPS = [
    { value: ymdKg(0), label: t("date_today") },
    { value: ymdKg(1), label: t("date_tomorrow") },
  ];

  const RATING_OPTIONS = [
    { value: "0",   label: t("rating_any") },
    { value: "4.0", label: "4.0+" },
    { value: "4.5", label: "4.5+" },
    { value: "4.8", label: "4.8+" },
  ] as const;

  const LUGGAGE_OPTIONS = [
    { value: "",      label: t("luggage_any") },
    { value: "yes",   label: t("luggage_big") },
    { value: "small", label: t("luggage_small") },
    { value: "no",    label: t("luggage_none") },
  ] as const;

  const { from: fromCity, to: toCity } = routeFromParams((k) => params.get(k));
  // Availability per day for the custom-date calendar below.
  const dayCounts    = useCalendarCounts("trips", fromCity?.id, toCity?.id);
  const sort         = params.get("sort")          ?? "time";
  const onlyVerified = params.get("only_verified") === "true";
  const womenOnly    = params.get("women_only")    === "true";
  const noSmoking    = params.get("no_smoking")    === "true";
  const petsAllowed  = params.get("pets")          === "true";
  const luggage      = params.get("luggage")       ?? "";
  const minPrice     = params.get("min_price")     ?? "";
  const maxPrice     = params.get("max_price")     ?? "";
  const minRating    = params.get("min_rating")    ?? "0";
  const dateParam    = params.get("date")          ?? "";

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("cursor");
      startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  const setRoute = (f: RoutePlace | null, tt: RoutePlace | null) => {
    const next = new URLSearchParams(params);
    setRouteParams(next, f, tt);
    next.delete("cursor");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // «Ближайшие» needs the viewer point — ask once, keep it in the URL.
  const pickSort = async (value: string) => {
    if (value !== "nearest") {
      update({ sort: value === "time" ? null : value, near: null });
      return;
    }
    const p = await getCurrentPoint();
    if (!p) {
      setGeoDenied(true);
      return;
    }
    setGeoDenied(false);
    update({ sort: "nearest", near: `${p.lat.toFixed(5)},${p.lng.toFixed(5)}` });
  };

  const PREF_ROWS: { key: string; active: boolean; icon: LucideIcon; label: string }[] = [
    { key: "women_only",    active: womenOnly,    icon: UserCheck,    label: t("pref_women_only") },
    { key: "no_smoking",    active: noSmoking,    icon: CigaretteOff, label: t("pref_no_smoking") },
    { key: "pets",          active: petsAllowed,  icon: PawPrint,     label: t("pref_pets") },
    { key: "only_verified", active: onlyVerified, icon: ShieldCheck,  label: t("only_verified") },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Route */}
      <div>
        <SectionLabel size="xs" className="mb-1.5">{t("route_label")}</SectionLabel>
        <div className="flex flex-col gap-1">
          {/* Commit only a chosen city — typing emits "" per keystroke and an
              empty from/to would bounce the user back to route entry. */}
          <CityAutocomplete compact value={fromCity} onChange={(v) => { if (v) setRoute(toRoutePlace(v), toCity); }} placeholder={t("from_placeholder")} />
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
            <button type="button" onClick={() => setRoute(toCity, fromCity)} disabled={!fromCity || !toCity} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-400 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-30 dark:border-ink-700" aria-label={t("swap_aria")}>
              <ArrowLeftRight className="h-2.5 w-2.5" />
            </button>
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
          </div>
          <CityAutocomplete compact value={toCity} onChange={(v) => { if (v) setRoute(fromCity, toRoutePlace(v)); }} placeholder={t("to_placeholder")} />
        </div>
      </div>

      {/* Date — the feed defaults to today when no date is set; «Каалаган/Любая»
          writes the explicit `any` sentinel to suppress that default. */}
      <div>
        <SectionLabel size="xs" className="mb-1.5">{t("date_label")}</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          <Chip kind="filter" selected={dateParam === "any"} onClick={() => update({ date: "any" })}>{t("date_any")}</Chip>
          {DATE_CHIPS.map((d) => (
            <Chip
              key={d.value}
              kind="filter"
              selected={dateParam === d.value || (!dateParam && d.value === ymdKg(0))}
              onClick={() => update({ date: d.value })}
            >
              {d.label}
            </Chip>
          ))}
        </div>
        <div className="mt-2">
          <DatePicker compact value={isCustomDate(dateParam) ? dateParam : ""} onChange={(v) => update({ date: v || null })} min={todayYMD()} placeholder={t("date_pick")} dayCounts={dayCounts} />
        </div>
      </div>

      {/* Sort */}
      <div>
        <SectionLabel size="xs" className="mb-1.5">{t("sort_label")}</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((o) => (
            <Chip key={o.value} kind="filter" selected={sort === o.value} onClick={() => void pickSort(o.value)}>{o.label}</Chip>
          ))}
        </div>
        {geoDenied && (
          <p className="mt-1.5 text-[12.5px] font-700 text-coral-500">{t("geo_denied")}</p>
        )}
      </div>

      {/* Rating */}
      <div>
        <SectionLabel size="xs" className="mb-1.5">{t("rating_label")}</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {RATING_OPTIONS.map((r) => (
            <Chip key={r.value} kind="filter" selected={minRating === r.value || (r.value === "0" && !params.get("min_rating"))} onClick={() => update({ min_rating: r.value === "0" ? null : r.value })}>{r.label}</Chip>
          ))}
        </div>
      </div>

      {/* Luggage */}
      <div>
        <SectionLabel size="xs" className="mb-1.5">{t("luggage_label")}</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {LUGGAGE_OPTIONS.map((o) => (
            <Chip key={o.value || "any"} kind="filter" selected={luggage === o.value} onClick={() => update({ luggage: o.value || null })}>{o.label}</Chip>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <SectionLabel size="xs" className="mb-1.5">{t("price_label")}</SectionLabel>
        <div className="flex items-center gap-2">
          <input type="number" inputMode="numeric" min={50} placeholder={t("price_from")} defaultValue={minPrice} onBlur={(e) => update({ min_price: e.target.value || null })} className={PRICE_INPUT} />
          <span className="text-[13px] text-ink-400">—</span>
          <input type="number" inputMode="numeric" min={50} placeholder={t("price_to")} defaultValue={maxPrice} onBlur={(e) => update({ max_price: e.target.value || null })} className={PRICE_INPUT} />
        </div>
      </div>

      {/* Preferences — toggle rows (spec §2.2 desktop sidebar) */}
      <div>
        <SectionLabel size="xs" className="mb-1">{t("prefs_label")}</SectionLabel>
        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {PREF_ROWS.map(({ key, active, icon: Icon, label }) => (
            // Whole row is a <label>, so tapping the icon/text toggles the switch.
            <label key={key} className="flex cursor-pointer items-center gap-2.5 py-2.5">
              <Icon className={active ? "h-4 w-4 shrink-0 text-brand-600" : "h-4 w-4 shrink-0 text-ink-400"} aria-hidden="true" />
              <span className="flex-1 text-[13px] font-800 text-ink-700 dark:text-ink-200">{label}</span>
              <Switch checked={active} onCheckedChange={(on) => update({ [key]: on ? "true" : null })} aria-label={label} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
