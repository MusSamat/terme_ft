"use client";

// Always-24h time picker: two native selects (hours 00–23, minutes step 5).
// Replaces <input type="time">, whose AM/PM display follows the OS locale
// and cannot be forced to a 24-hour clock.

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

interface Props {
  /** "HH:MM" or "" */
  value: string;
  onChange: (v: string) => void;
  className?: string;
  selectClassName?: string;
  ariaLabel?: string;
}

export function TimeSelect24({ value, onChange, className, selectClassName, ariaLabel }: Props) {
  const [h = "", m = ""] = value.split(":");
  // min-w-0 + flex-1 (added below) keep the two selects inside their container
  // on narrow screens instead of overflowing into a horizontal scroll.
  const base =
    selectClassName ??
    "h-12 min-w-0 flex-1 rounded-2xl border-2 border-ink-200 bg-ink-50 px-2 text-center text-[15px] font-semibold text-ink-900 outline-none focus:border-brand-400 focus:bg-white dark:focus:bg-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white";
  return (
    <div className={className ?? "flex w-full items-center gap-1.5"}>
      <select
        value={h}
        aria-label={ariaLabel}
        onChange={(e) => onChange(`${e.target.value}:${m || "00"}`)}
        className={base}
      >
        {h === "" && <option value="" disabled>—</option>}
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>{hh}</option>
        ))}
      </select>
      <span className="text-[15px] font-bold text-ink-400">:</span>
      <select
        value={m}
        aria-label={ariaLabel}
        onChange={(e) => onChange(`${h || "00"}:${e.target.value}`)}
        className={base}
      >
        {m === "" && <option value="" disabled>—</option>}
        {MINUTES.map((mm) => (
          <option key={mm} value={mm}>{mm}</option>
        ))}
      </select>
    </div>
  );
}
