"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarCheck, CalendarSearch, ChevronRight } from "lucide-react";
import { useCalendarCounts } from "@/lib/hooks/use-calendar-counts";
import { DatePickerModal } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils/cn";

// Inline «next day» jump shown when the selected day is empty or its list ends —
// so the user reaches the next day WITH rides without scrolling back to the
// header stepper. Uses the same per-day calendar counts as SmartDateNav and
// renders nothing when there's no future day with items (never a dead end).
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
function ymdKg(offset = 0): string {
  return new Date(Date.now() + 6 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);
}
function fmt(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function NextDayCta({ kind }: { kind: "trips" | "requests" }) {
  const t = useTranslations("feed");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const counts = useCalendarCounts(kind, from, to, Boolean(from && to));
  const [pickerOpen, setPickerOpen] = useState(false);

  // Only when the per-day counts are loaded AND non-empty — an all-empty map
  // means «no calendar data yet», so don't flash a dead-end calendar link.
  if (!from || !to || !counts || Object.keys(counts).length === 0) return null;

  const today = ymdKg(0);
  const tomorrow = ymdKg(1);
  const raw = sp.get("date");
  const current = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const next = Object.keys(counts)
    .filter((d) => (counts[d] ?? 0) > 0 && d >= today)
    .sort()
    .find((d) => d > current);
  const grape = kind === "requests";

  const goDate = (v: string) => {
    const p = new URLSearchParams(sp);
    p.set("date", v);
    p.delete("cursor");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  // No further day with rides → a link that opens the calendar (never a
  // dead-end or a «0» button).
  if (!next) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={cn("mt-3 flex w-full items-center justify-center gap-2 text-[13px] font-800 underline underline-offset-2", grape ? "text-grape-600" : "text-brand-600")}
        >
          <CalendarSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("next_day_none")}
        </button>
        <DatePickerModal open={pickerOpen} onOpenChange={setPickerOpen} value={current} onChange={(v) => { if (v) goDate(v); }} min={today} title={t("pick_date")} dayCounts={counts} />
      </>
    );
  }

  const label = next === tomorrow ? t("tomorrow") : fmt(next);
  const go = () => goDate(next);

  return (
    <button
      type="button"
      onClick={go}
      className={cn(
        "mt-3 flex w-full items-center gap-2.5 rounded-2xl border px-4 py-3.5 text-left text-[14px] font-800 transition-colors",
        grape
          ? "border-grape-200 bg-grape-50 text-grape-700 hover:bg-grape-100 dark:border-grape-500/30 dark:bg-grape-500/10 dark:text-grape-300"
          : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300",
      )}
    >
      <CalendarCheck className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span className="flex-1">
        {t(grape ? "next_day_cta_requests" : "next_day_cta_trips", { date: label, n: counts[next] ?? 0 })}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
    </button>
  );
}
