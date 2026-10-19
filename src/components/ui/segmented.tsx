"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** unread-count badge inside the segment */
  count?: number;
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** accent for the active segment text */
  tone?: "brand";
  /** explicit active-text classes (overrides `tone`), e.g. ROLE_THEME[role].textOn */
  textOn?: string;
  className?: string;
}

// design-spec §1.7 segmented control — literal maps, no interpolation
const TONE_ON: Record<"brand", string> = {
  brand: "text-brand-700 dark:text-brand-300",
};

/** Segmented control (feed tabs, «Мои» tabs, role switch). Active = white card. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = "brand",
  textOn,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      className={cn("flex gap-1 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800", className)}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              // min-h-[44px] = touch-target floor; active:scale = instant press feedback
              "flex min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] transition duration-100 active:scale-[0.97]",
              active
                ? cn("bg-white font-900 shadow-sm dark:bg-ink-900", textOn ?? TONE_ON[tone])
                : "font-800 text-ink-500 hover:text-ink-700 dark:hover:text-ink-300",
            )}
          >
            {opt.icon}
            {opt.label}
            {typeof opt.count === "number" && opt.count > 0 && (
              <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-900 text-white">
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
