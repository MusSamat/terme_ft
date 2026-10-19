"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { DatePicker } from "@/components/ui/date-picker";
import { useCalendarCounts } from "@/lib/hooks/use-calendar-counts";
import { routeFromParams, setRouteParams, toRoutePlace, type RoutePlace } from "@/lib/places";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">{label}</p>
      {children}
    </div>
  );
}

const selectCls =
  "h-10 w-full rounded-xl border-2 border-ink-200 bg-ink-50 px-3 text-[15px] font-semibold text-ink-900 outline-none focus:border-brand-400 focus:bg-white transition-colors dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:focus:bg-ink-900";

export function RequestFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useTranslations("request_filters");

  const { from, to } = routeFromParams((k) => params.get(k));
  const date = params.get("date") ?? "";
  const seats = params.get("seats") ?? "";
  // Availability per day for the date calendar below.
  const dayCounts = useCalendarCounts("requests", from?.id, to?.id);

  const setRoute = (f: RoutePlace | null, tt: RoutePlace | null) => {
    const next = new URLSearchParams(params);
    setRouteParams(next, f, tt);
    next.delete("cursor");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("cursor");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const clear = () => router.replace(pathname, { scroll: false });
  const hasFilters = from || to || date || seats;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[17px] font-extrabold text-ink-900 dark:text-white">{t("title")}</p>

      {/* From/To with swap */}
      <Field label={t("route_label")}>
        <div className="flex flex-col gap-1">
          <CityAutocomplete
            compact
            value={from}
            onChange={(v) => setRoute(v ? toRoutePlace(v) : null, to)}
            placeholder={t("from_placeholder")}
          />
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
            <button
              type="button"
              onClick={() => setRoute(to, from)}
              disabled={!from && !to}
              aria-label={t("swap_aria")}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-400 hover:border-brand-300 hover:text-brand-600 disabled:opacity-30 transition-colors dark:bg-ink-800 dark:border-ink-700"
            >
              <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden />
            </button>
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
          </div>
          <CityAutocomplete
            compact
            value={to}
            onChange={(v) => setRoute(from, v ? toRoutePlace(v) : null)}
            placeholder={t("to_placeholder")}
          />
        </div>
      </Field>

      <Field label={t("date_label")}>
        <DatePicker
          compact
          value={date}
          onChange={(v) => update({ date: v || null })}
          dayCounts={dayCounts}
        />
      </Field>

      <Field label={t("seats_label")}>
        <select
          value={seats}
          onChange={(e) => update({ seats: e.target.value || null })}
          className={selectCls}
        >
          <option value="">{t("any_seats")}</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{n}+</option>
          ))}
        </select>
      </Field>

      {hasFilters && (
        <button
          type="button"
          onClick={clear}
          className="mt-1 text-[13px] font-bold text-ink-400 hover:text-brand-600 transition-colors text-left"
        >
          {t("reset")}
        </button>
      )}
    </div>
  );
}
