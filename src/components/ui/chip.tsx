import { Plus, X } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// Chip recipes — design-spec §1.7. Explicit literal class maps per accent so
// Tailwind's scanner picks every class up (never interpolate color names).

export type ChipKind = "filter" | "quick" | "time" | "date" | "pref" | "removable" | "add";
export type ChipAccent = "brand" | "accent";

/** Tinted selected state: border + soft bg (filter / pref chips). */
const TINT_ON: Record<ChipAccent, string> = {
  brand: "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  accent: "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300",
};

/** Filled selected state (leading «Фильтры» chip, date chips). */
const FILL_ON: Record<ChipAccent, string> = {
  brand: "bg-brand-600 text-white",
  accent: "bg-accent-500 text-accent-ink",
};

/** Date chip selected — always white text on {acc}-500. */
const DATE_ON: Record<ChipAccent, string> = {
  brand: "bg-brand-500 text-white",
  accent: "bg-accent-500 text-white",
};

/** Dashed add-chip («+ город» / «+ точка»). */
const ADD: Record<ChipAccent, string> = {
  brand: "border-brand-300 text-brand-600 dark:border-brand-500/40 dark:text-brand-300",
  accent: "border-accent-300 text-accent-600 dark:border-accent-500/40 dark:text-accent-300",
};

/** Unselected thin-border chip (filter). */
const FILTER_OFF = "border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300";
/** Unselected border-2 white chip (quick / time / date / pref OFF). */
const OUTLINE2_OFF =
  "border-2 border-ink-200 bg-white text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: ChipKind;
  selected?: boolean;
  accent?: ChipAccent;
  /** leading icon (h-3.5 w-3.5 recommended) */
  icon?: ReactNode;
  /** removable chips: click handler for the whole chip (trailing ✕ rendered) */
  onRemove?: () => void;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  (
    { kind = "filter", selected = false, accent = "brand", icon, onRemove, className, children, onClick, ...rest },
    ref,
  ) => {
    let cls: string;
    switch (kind) {
      case "filter":
        cls = cn(
          "rounded-full border px-3 py-1.5 text-[14px] font-800",
          selected ? TINT_ON[accent] : FILTER_OFF,
        );
        break;
      case "quick":
        cls = cn(
          "rounded-full px-3 py-1.5 text-[14px] font-800",
          selected ? FILL_ON[accent] : OUTLINE2_OFF,
        );
        break;
      case "time":
        cls = cn(
          "rounded-full px-3 py-1.5 text-[14px]",
          selected ? "bg-accent-500 font-900 text-accent-ink" : cn(OUTLINE2_OFF, "font-800"),
        );
        break;
      case "date":
        cls = cn(
          "rounded-full text-[14px] font-800",
          selected ? cn("px-3.5 py-1.5", DATE_ON[accent]) : cn("px-3 py-1.5", OUTLINE2_OFF),
        );
        break;
      case "pref":
        cls = cn(
          "rounded-full border-2 px-3 py-1.5 text-[14px] font-800",
          selected ? TINT_ON[accent] : "border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300",
        );
        break;
      case "removable":
        cls =
          "rounded-full bg-white px-2.5 py-1 text-[14px] font-800 text-ink-800 shadow-xs dark:bg-ink-900 dark:text-ink-100";
        break;
      case "add":
        cls = cn("rounded-full border border-dashed px-2.5 py-1 text-[14px] font-800", ADD[accent]);
        break;
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={kind === "removable" || kind === "add" ? undefined : selected}
        onClick={kind === "removable" && onRemove ? () => onRemove() : onClick}
        className={cn("inline-flex shrink-0 items-center gap-1 transition-colors", cls, className)}
        {...rest}
      >
        {kind === "add" && <Plus className="h-3 w-3" aria-hidden="true" />}
        {icon}
        {children}
        {kind === "removable" && (
          <X className="h-3 w-3 text-ink-400" aria-hidden="true" />
        )}
      </button>
    );
  },
);
Chip.displayName = "Chip";
