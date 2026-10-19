"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

// Seats — compact row: label (+ optional car-capacity hint) left, −/+ stepper
// right. Label differs by role («Свободных мест» / «Сколько мест»).

interface Props {
  value: number;
  min?: number;
  max?: number;
  label: string;
  /** e.g. «Мест в вашем авто: 4» — a small hint under the label (driver mode). */
  hint?: string;
  counterText: string;
  /** −/+ names when the stepper counts something other than seats. */
  lessAria?: string;
  moreAria?: string;
  onChange: (v: number) => void;
}

export function SeatsStepper({ value, min = 1, max = 8, label, hint, counterText, lessAria, moreAria, onChange }: Props) {
  const t = useTranslations("trips.create");
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800">
      <div className="min-w-0">
        <span className="text-[15px] font-900 text-ink-900 dark:text-white">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-[12.5px] font-700 text-ink-500 dark:text-ink-400">{hint}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={lessAria ?? t("seats_less_aria")}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink-200 text-[20px] font-900 text-ink-600 disabled:opacity-40 dark:border-ink-700 dark:text-ink-300"
        >
          −
        </button>
        <span className={cn("min-w-[24px] text-center text-[20px] font-900", counterText)}>{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={moreAria ?? t("seats_more_aria")}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink-200 text-[20px] font-900 text-ink-600 disabled:opacity-40 dark:border-ink-700 dark:text-ink-300"
        >
          +
        </button>
      </div>
    </div>
  );
}
