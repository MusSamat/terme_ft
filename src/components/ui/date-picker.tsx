"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Modal, ModalContent, ModalTitle } from "@/components/ui/modal";
import {
  type Locale,
  toYMD,
  parseYMD,
  formatDisplay,
  buildGrid,
  dayYMD,
} from "./date-picker-utils";

// Hardcoded names: Intl.DateTimeFormat("ky") is missing in some browsers
// (e.g. Firefox) and silently falls back to English (“Mon Tue …”).
const CAL_NAMES: Record<Locale, { weekdays: string[]; months: string[] }> = {
  ru: {
    weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    months: [
      "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
      "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
    ],
  },
  kg: {
    weekdays: ["Дш", "Ше", "Ша", "Бш", "Жм", "Иш", "Жк"],
    months: [
      "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
      "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
    ],
  },
};

function useResolvedLocale(locale?: Locale): Locale {
  const activeLocale = useLocale();
  return locale ?? (activeLocale === "kg" ? "kg" : "ru");
}

// ── Modal calendar (single-tap picker, shared by web + mobile) ───────────────
export interface DatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;          // YYYY-MM-DD or ""
  /** Selecting a day confirms immediately and closes the modal */
  onChange: (v: string) => void;
  min?: string;           // YYYY-MM-DD — days before are disabled
  max?: string;
  locale?: Locale;
  title?: string;
  /** YYYY-MM-DD → count; shows availability under each day (e.g. trips per day). */
  dayCounts?: Record<string, number>;
}

export function DatePickerModal({
  open,
  onOpenChange,
  value,
  onChange,
  min,
  max,
  locale,
  title,
  dayCounts,
}: DatePickerModalProps) {
  const t = useTranslations("date_picker");
  const resolvedLocale = useResolvedLocale(locale);
  const today = toYMD(new Date());

  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  // When opening, jump the calendar to the currently-selected month
  useEffect(() => {
    if (!open) return;
    const d = parseYMD(value);
    const base = d ?? new Date();
    setView({ year: base.getFullYear(), month: base.getMonth() });
  }, [open, value]);

  const weekdays = CAL_NAMES[resolvedLocale].weekdays;
  const monthLabel = CAL_NAMES[resolvedLocale].months[view.month];

  const prevMonth = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  const nextMonth = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));

  // Disable "prev" when the entire previous month is before min
  const lastOfPrev = dayYMD(
    view.month === 0 ? view.year - 1 : view.year,
    view.month === 0 ? 11 : view.month - 1,
    new Date(view.year, view.month, 0).getDate(),
  );
  const prevDisabled = min !== undefined && lastOfPrev < min;

  const select = (day: number) => {
    onChange(dayYMD(view.year, view.month, day));
    onOpenChange(false);
  };

  const grid = buildGrid(view.year, view.month);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent aria-describedby={undefined} className="max-w-[360px] p-4">
        <ModalTitle className="mb-2 pr-8 text-[17px] font-900 text-ink-900 dark:text-white">
          {title ?? t("select_date")}
        </ModalTitle>

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            disabled={prevDisabled}
            aria-label={t("prev_month")}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-700 transition-colors hover:bg-ink-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-25 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
          >
            <ChevronLeft className="h-7 w-7" aria-hidden="true" />
          </button>
          <span className="text-[16px] font-800 text-ink-900 dark:text-white">
            {monthLabel} {view.year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label={t("next_month")}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-700 transition-colors hover:bg-ink-200 active:scale-95 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
          >
            <ChevronRight className="h-7 w-7" aria-hidden="true" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="mt-1 grid grid-cols-7">
          {weekdays.map((d, i) => (
            <div
              key={d}
              className={cn(
                "text-center text-[13px] font-700",
                i >= 5 ? "text-ink-500" : "text-ink-400",
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="mt-1 grid grid-cols-7 gap-y-1">
          {grid.map((day, i) => {
            if (!day) return <div key={`_${i}`} />;
            const ymd = dayYMD(view.year, view.month, day);
            const disabled = (min !== undefined && ymd < min) || (max !== undefined && ymd > max);
            const selected = ymd === value;
            const isToday = ymd === today;
            const weekend = i % 7 >= 5;
            const count = !disabled ? dayCounts?.[ymd] : undefined;
            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() => select(day)}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-xl text-[15px] font-700 transition-colors",
                  dayCounts ? "h-12" : "h-11",
                  disabled && "cursor-not-allowed opacity-25",
                  selected && "bg-brand-600 font-800 text-white",
                  !selected && !disabled && "hover:bg-ink-100 dark:hover:bg-ink-800",
                  !selected && isToday && "font-800 text-brand-600 ring-1 ring-brand-500 dark:text-brand-300",
                  !selected && !isToday && !disabled && weekend && "text-ink-500",
                  !selected && !isToday && !disabled && !weekend && "text-ink-800 dark:text-ink-100",
                )}
              >
                <span className="leading-none">{day}</span>
                {/* Availability hint — trips/requests per day; 0 shown muted */}
                {dayCounts && (
                  <span
                    className={cn(
                      "mt-0.5 text-[9px] font-800 leading-none",
                      selected
                        ? "text-white/90"
                        : disabled
                          ? "text-transparent"
                          : count
                            ? "text-brand-600 dark:text-brand-300"
                            : "text-ink-300 dark:text-ink-600",
                    )}
                  >
                    {count ?? 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Clear */}
        {value && (
          <div className="mt-2 border-t border-ink-100 pt-2.5 dark:border-ink-800">
            <button
              type="button"
              onClick={() => { onChange(""); onOpenChange(false); }}
              className="text-[15px] font-700 text-ink-400 transition-colors hover:text-brand-600 dark:hover:text-brand-300"
            >
              {t("clear")}
            </button>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

// ── Field trigger + modal (drop-in: one tap opens the calendar) ──────────────
export interface DatePickerProps {
  value: string;          // YYYY-MM-DD or ""
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;           // YYYY-MM-DD — days before are disabled
  max?: string;
  locale?: Locale;
  /** Smaller trigger for sidebar / filter contexts */
  compact?: boolean;
  /** No border / background on trigger — embed inside a card field */
  borderless?: boolean;
  className?: string;
  /** Extra classes for the trigger button (match surrounding form fields) */
  triggerClassName?: string;
  /** YYYY-MM-DD → count; availability hints under each calendar day. */
  dayCounts?: Record<string, number>;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  min,
  max,
  locale,
  compact = false,
  borderless = false,
  className,
  triggerClassName,
  dayCounts,
}: DatePickerProps) {
  const t = useTranslations("date_picker");
  const resolvedLocale = useResolvedLocale(locale);
  const [open, setOpen] = useState(false);

  const displayStr = formatDisplay(value, resolvedLocale);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-1.5 text-left transition-colors",
          borderless
            ? "bg-transparent"
            : cn(
                compact ? "h-9" : "h-10",
                "rounded-xl border bg-white px-3 dark:bg-ink-900",
                open
                  ? "border-brand-500 ring-2 ring-brand-100 dark:ring-brand-500/20"
                  : "border-ink-200 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-600",
              ),
          triggerClassName,
        )}
      >
        {!borderless && (
          <CalendarDays
            className={cn(
              "flex-shrink-0",
              compact ? "h-3.5 w-3.5" : "h-4 w-4",
              value ? "text-brand-600 dark:text-brand-300" : "text-ink-400",
            )}
            aria-hidden="true"
          />
        )}
        <span
          className={cn(
            "flex-1 truncate font-semibold",
            compact ? "text-[13px]" : "text-[15px]",
            displayStr ? "text-ink-900 dark:text-white" : "text-ink-400",
          )}
        >
          {displayStr || (placeholder ?? t("any_date"))}
        </span>
        {value && (
          <span
            role="button"
            aria-label={t("clear")}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="flex-shrink-0 cursor-pointer text-ink-300 hover:text-ink-500"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </button>

      <DatePickerModal
        open={open}
        onOpenChange={setOpen}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        locale={locale}
        dayCounts={dayCounts}
      />
    </div>
  );
}
