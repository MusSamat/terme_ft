"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownUp, ArrowLeft, CalendarDays, SlidersHorizontal } from "lucide-react";
import { DatePickerModal } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils/cn";

// Results-page header (Yandex «Межгород» style): a compact bar — back +
// «Когда хотите поехать?» + the route + swap — over a row of quick date chips
// (Сегодня · Завтра · …) and the filters icon. The full route (Откуда/Куда) is
// edited inside the filters sheet, so the header stays tidy.

type FeedTab = "trips" | "requests";

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function ymdKg(offsetDays = 0): string {
  return new Date(Date.now() + 6 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

interface FeedHeaderProps {
  tab: FeedTab;
  onOpenFilters: () => void;
}

export function FeedHeader({ tab, onOpenFilters }: FeedHeaderProps) {
  const t = useTranslations("feed");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);

  const from = params.get("from") ?? params.get("from_city") ?? "";
  const to = params.get("to") ?? params.get("to_city") ?? "";
  const grape = tab === "requests";

  const today = ymdKg(0);
  const tomorrow = ymdKg(1);
  const raw = params.get("date");
  const current = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("cursor");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const setDate = (d: string) => update({ date: d === today ? null : d });

  const label = (d: string) => {
    if (d === today) return t("today");
    if (d === tomorrow) return t("tomorrow");
    const dt = new Date(`${d}T00:00:00`);
    return `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
  };

  const days = [ymdKg(0), ymdKg(1), ymdKg(2)];

  const chipCls = (sel: boolean) =>
    cn(
      "flex h-9 shrink-0 items-center rounded-full px-4 text-[13.5px] font-800 transition-colors",
      sel
        ? grape
          ? "bg-grape-600 text-white"
          : "bg-brand-600 text-white"
        : "border border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200",
    );

  return (
    <div className="border-b border-ink-100 dark:border-ink-800">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label={t("back") /* falls back gracefully */}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[15px] font-900 text-ink-900 dark:text-white">{t("when_go")}</div>
          {from && to && (
            <div className="truncate text-[12px] font-700 text-ink-400">{from} — {to}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => update({ from: to || null, to: from || null })}
          disabled={!from || !to}
          aria-label={t("swap_aria")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-colors disabled:opacity-40 dark:bg-ink-800 dark:text-ink-300"
        >
          <ArrowDownUp className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 pb-3">
        {days.map((d) => (
          <button key={d} type="button" onClick={() => setDate(d)} className={chipCls(d === current)}>
            {label(d)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={t("pick_date")}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            !days.includes(current)
              ? grape ? "bg-grape-600 text-white" : "bg-brand-600 text-white"
              : "border border-ink-200 bg-white text-ink-600 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300",
          )}
        >
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="ml-auto shrink-0">
          <button
            type="button"
            onClick={onOpenFilters}
            aria-label={t("filters")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <DatePickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={/^\d{4}-\d{2}-\d{2}$/.test(current) ? current : ""}
        onChange={(v) => { if (v) setDate(v); }}
        min={today}
        title={t("pick_date")}
      />
    </div>
  );
}
