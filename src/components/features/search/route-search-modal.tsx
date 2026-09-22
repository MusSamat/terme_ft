"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Circle, Flag, MapPin, X } from "lucide-react";
import { searchCities, getCities, type City } from "@/lib/api/cities";

// Route search modal (Yandex «Межгород» style): Откуда + Куда together at the
// top, one shared suggestions list below, max 95vh. Mirrors the Flutter
// route_search_sheet so web-mobile and native behave the same.
export function RouteSearchModal({
  open,
  initialFrom,
  initialTo,
  focusTo,
  onClose,
  onApply,
}: {
  open: boolean;
  initialFrom: string;
  initialTo: string;
  focusTo: boolean;
  onClose: () => void;
  onApply: (from: string, to: string) => void;
}) {
  const t = useTranslations("feed");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [activeTo, setActiveTo] = useState(focusTo);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  // Seed on open + focus the tapped field.
  useEffect(() => {
    if (!open) return;
    setFrom(initialFrom);
    setTo(initialTo);
    setActiveTo(focusTo);
    setQuery(focusTo ? initialTo : initialFrom);
    const el = focusTo ? toRef.current : fromRef.current;
    // rAF so the element is mounted before focusing
    requestAnimationFrame(() => el?.focus());
  }, [open, initialFrom, initialTo, focusTo]);

  // Debounced suggestions for the active field.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const q = query.trim();
    const id = setTimeout(async () => {
      try {
        const r = q ? await searchCities(q, 12) : await getCities(12);
        if (!cancelled) setResults(r);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(id); };
  }, [query, open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const pick = (city: City) => {
    const name = city.nameRu;
    if (activeTo) {
      setTo(name);
      if (!from.trim()) { setActiveTo(false); setQuery(from); requestAnimationFrame(() => fromRef.current?.focus()); }
      else onApply(from, name);
    } else {
      setFrom(name);
      if (!to.trim()) { setActiveTo(true); setQuery(to); requestAnimationFrame(() => toRef.current?.focus()); }
      else onApply(name, to);
    }
  };

  const bothSet = Boolean(from.trim() && to.trim());

  const field = (
    value: string,
    setValue: (v: string) => void,
    ref: React.RefObject<HTMLInputElement>,
    isTo: boolean,
    dot: React.ReactNode,
    placeholder: string,
  ) => (
    <div className="flex items-center gap-2.5 px-3">
      {dot}
      <input
        ref={ref}
        value={value}
        onChange={(e) => { setValue(e.target.value); setActiveTo(isTo); setQuery(e.target.value); }}
        onFocus={() => { setActiveTo(isTo); setQuery(value); }}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent py-3 text-[14px] font-700 text-ink-900 outline-none placeholder:font-600 placeholder:text-ink-400 dark:text-white"
      />
      {value && (
        <button
          type="button"
          onClick={() => { setValue(""); setActiveTo(isTo); setQuery(""); ref.current?.focus(); }}
          className="p-1.5 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
          aria-label={t("clear")}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[90] mx-auto flex max-h-[82vh] w-full max-w-[560px] flex-col rounded-t-4xl bg-ink-50 shadow-lift dark:bg-ink-950">
        <div className="flex items-start gap-2 p-4">
          <div className="min-w-0 flex-1 rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
            {field(from, setFrom, fromRef, false,
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600"><Circle className="h-2.5 w-2.5 fill-white text-white" aria-hidden="true" /></span>,
              t("from_placeholder"))}
            <div className="ml-[46px] border-t border-ink-100 dark:border-ink-800" />
            {field(to, setTo, toRef, true,
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-500"><Flag className="h-4 w-4 text-white" aria-hidden="true" /></span>,
              t("to_placeholder"))}
          </div>
          <button
            type="button"
            onClick={() => (bothSet ? onApply(from, to) : onClose())}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200"
            aria-label={bothSet ? t("find_trip") : t("close")}
          >
            {bothSet ? <Check className="h-5 w-5" aria-hidden="true" /> : <X className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {results.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => pick(city)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink-100 dark:hover:bg-ink-900"
            >
              <MapPin className="h-[18px] w-[18px] shrink-0 text-ink-400" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-700 text-ink-900 dark:text-white">{city.nameRu}</span>
                {city.regionNameRu && (
                  <span className="block truncate text-[12px] font-600 text-ink-400">{city.regionNameRu}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
