"use client";

import { useEffect, useRef, useState, useId } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MapPin } from "lucide-react";
import { searchCities, getCities, type City } from "@/lib/api/cities";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/i18n.config";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Fires on every keystroke with the raw typed text (before dropdown selection) */
  onInputChange?: (raw: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  /** Smaller padding + font for sidebar/filter contexts */
  compact?: boolean;
  /** Remove border + ring — use when the input is inside a card that provides its own border */
  borderless?: boolean;
  /** Open the results dropdown UPWARD (above the input) — use when docked near the screen bottom */
  dropUp?: boolean;
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Dropdown subtitle in the selected language: "район, айыл аймак" (the most
 * useful disambiguators). Falls back to район alone, then to region for
 * oblast-level cities that have neither.
 */
function getSubtitle(city: City, locale: Locale): string {
  const kg = locale === "kg";
  if (city.type === "raion") return "район";
  const district = (kg ? city.districtNameKg : city.districtNameRu)?.trim();
  const aimak = (kg ? city.aiylAimakNameKg : city.aiylAimakNameRu)?.trim();
  const parts = [district, aimak].filter((p): p is string => !!p);
  if (parts.length) return parts.join(", ");
  // Oblast-level город with no district → tag it (never show the oblast).
  if (city.type === "city") return kg ? "шаар" : "город";
  return "";
}

// Module-level cache — fetched once for the session, shared across all instances.
let popularCache: City[] | null = null;
async function loadPopularCities(): Promise<City[]> {
  if (popularCache) return popularCache;
  try {
    // Endpoint orders by priority DESC — the first 7 ARE the popular ones;
    // don't pull the whole 1000-row directory just to slice it.
    popularCache = await getCities(7);
    return popularCache;
  } catch {
    // Don't cache a failure — the next focus retries instead of leaving the
    // dropdown permanently empty for the session.
    return [];
  }
}

export function CityAutocomplete({
  value,
  onChange,
  onInputChange,
  placeholder,
  label,
  className,
  disabled,
  id: externalId,
  compact = false,
  borderless = false,
  dropUp = false,
}: Props) {
  const t = useTranslations("city_autocomplete");
  const locale = useLocale() as Locale;
  const ph = placeholder ?? t("enter_city");
  const autoId = useId();
  const inputId = externalId ?? autoId;

  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [showingPopular, setShowingPopular] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedRef = useRef(false);
  const userTypingRef = useRef(false);
  const searchSeqRef = useRef(0);
  // "typed text matches nothing" — drives the explanatory hint under the input
  const [noMatch, setNoMatch] = useState(false);

  const debouncedQuery = useDebounce(query, 250);

  // Sync external value → internal query when not actively typing.
  useEffect(() => {
    if (value !== query && !open) setQuery(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current = false;
      return;
    }
    // Popular list is on display (focus, no typing yet) — the search effect
    // must not stomp it: it re-runs on the showingPopular flip and used to
    // wipe the results before the user saw them.
    if (showingPopular) return;
    if (!debouncedQuery.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    // Guard against out-of-order responses: a slow reply for an older query
    // must never overwrite results of the newer one.
    const seq = ++searchSeqRef.current;
    searchCities(debouncedQuery, 8)
      .then((rows) => {
        if (seq !== searchSeqRef.current) return;
        setResults(rows);
        setOpen(userTypingRef.current && rows.length > 0);
        // Auto-highlight the top suggestion (combobox best practice): Enter
        // or blur commits it without requiring an arrow-down first.
        setActiveIdx(rows.length > 0 ? 0 : -1);
        setNoMatch(userTypingRef.current && rows.length === 0);
      })
      .catch(() => {
        if (seq !== searchSeqRef.current) return;
        setResults([]);
        setOpen(false);
      })
      .finally(() => {
        if (seq === searchSeqRef.current) setLoading(false);
      });
  }, [debouncedQuery, showingPopular]);

  const commit = (city: City) => {
    selectedRef.current = true;
    userTypingRef.current = false;
    setShowingPopular(false);
    setNoMatch(false);
    setQuery(city.nameRu);
    onChange(city.nameRu);
    setOpen(false);
    setResults([]);
    setActiveIdx(-1);
  };

  const handleFocus = async (e?: React.FocusEvent<HTMLInputElement>) => {
    if (userTypingRef.current && results.length > 0) {
      setOpen(true);
      return;
    }
    // Filled field: select the text so the first keystroke replaces it.
    if (query.trim()) e?.target.select();
    // Focus (empty OR already-filled) → popular cities; editing → live search.
    const popular = await loadPopularCities();
    if (popular.length > 0) {
      setResults(popular);
      setShowingPopular(true);
      setOpen(true);
      setActiveIdx(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // activeIdx defaults to the top suggestion, so plain Enter picks it.
      const city = results[activeIdx] ?? results[0];
      if (city) commit(city);
    } else if (e.key === "Escape") {
      setOpen(false);
      setShowingPopular(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-ink-500"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {!borderless && (
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={ph}
          onChange={(e) => {
            userTypingRef.current = true;
            setShowingPopular(false);
            setNoMatch(false);
            setQuery(e.target.value);
            onChange("");
            onInputChange?.(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={() => {
            userTypingRef.current = false;
            // Leaving the field with typed text auto-commits the best match
            // ("Бишке" → Бишкек) so the form never sits silently disabled:
            // exact name match first, otherwise the top-ranked suggestion.
            const q = query.trim().toLowerCase();
            if (q && !value && !showingPopular) {
              const exact = results.find((c) => c.nameRu.toLowerCase() === q || c.nameKg.toLowerCase() === q);
              const best = exact ?? results[0];
              if (best) {
                commit(best);
                return;
              }
              setNoMatch(true);
            }
            setTimeout(() => {
              setOpen(false);
              setShowingPopular(false);
            }, 150);
          }}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${inputId}-list`}
          aria-activedescendant={activeIdx >= 0 ? `${inputId}-opt-${activeIdx}` : undefined}
          className={cn(
            "w-full bg-transparent font-semibold text-ink-900 outline-none dark:text-white",
            compact ? "py-1.5 text-[14px]" : "py-2 text-[17px]",
            borderless ? "pr-3" : "rounded-2xl border border-ink-200 bg-white pl-9 pr-3 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900",
            noMatch && !borderless && "border-coral-400 focus:border-coral-400",
            "placeholder:text-ink-400",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        {loading && (
          <span
            className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500"
            aria-hidden="true"
          />
        )}

        {/* Dropdown anchored to the input itself (absolute, not a viewport-fixed
            portal) so it stays glued below the field even when the mobile
            keyboard shifts the visual viewport. */}
        {open && results.length > 0 && (
          <ul
            ref={listRef}
            id={`${inputId}-list`}
            role="listbox"
            className={cn(
              "absolute left-0 right-0 z-50 max-h-[45vh] min-w-[240px] overflow-y-auto overscroll-contain rounded-2xl border border-ink-100 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900",
              dropUp ? "bottom-full mb-2" : "top-full mt-2",
            )}
          >
            {showingPopular && (
              <li className="border-b border-ink-100 px-4 py-2 dark:border-ink-800">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
                  {t("popular_cities")}
                </span>
              </li>
            )}
            {results.map((city, idx) => (
              <li
                key={city.id}
                id={`${inputId}-opt-${idx}`}
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(city);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 transition-colors",
                  compact ? "px-3 py-1.5" : "px-4 py-2.5",
                  idx === activeIdx ? "bg-brand-50 dark:bg-brand-500/15" : "hover:bg-ink-50 dark:hover:bg-ink-800",
                )}
              >
                <MapPin className="h-3 w-3 flex-shrink-0 text-ink-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className={cn("font-bold text-ink-900 dark:text-white", compact ? "text-[14px]" : "text-[16px]")}>{city.nameRu}</p>
                  <p className="text-[14px] font-semibold text-ink-400">{getSubtitle(city, locale)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {noMatch && (
        <p className="mt-1 text-[13px] font-semibold text-coral-500" role="alert">
          {query.trim() && results.length === 0 ? t("no_matches") : t("pick_from_list")}
        </p>
      )}
    </div>
  );
}
