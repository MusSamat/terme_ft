"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MapPin, Search, ChevronRight } from "lucide-react";
import { searchPlaces, getTopPlaces, type Place } from "@/lib/api/cities";
import { placeName, placeSubtitle } from "@/lib/places";
import { Modal, ModalContent, ModalTitle } from "@/components/ui/modal";
import type { Locale } from "@/i18n.config";
import { cn } from "@/lib/utils/cn";

// A tap-to-open city picker: the field is a button; picking happens in a focused
// modal with its own search. Best practice on mobile — a step, not a floating
// dropdown that fights the keyboard (1:1 with the Flutter city sheet).
interface Props {
  value: { nameRu: string; nameKg: string } | null;
  placeholder: string;
  onChange: (value: Place) => void;
  className?: string;
}

let popularCache: Place[] | null = null;
async function loadPopular(): Promise<Place[]> {
  if (popularCache) return popularCache;
  try {
    popularCache = await getTopPlaces(8);
    return popularCache;
  } catch {
    return [];
  }
}

export function CityPickerField({ value, placeholder, onChange, className }: Props) {
  const t = useTranslations("city_autocomplete");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularShown, setPopularShown] = useState(false);
  const seqRef = useRef(0);

  // On open: reset + show popular cities.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setQ("");
    void loadPopular().then((p) => {
      if (active) {
        setResults(p);
        setPopularShown(true);
      }
    });
    return () => {
      active = false;
    };
  }, [open]);

  // Debounced live search (guards against out-of-order responses).
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!term) {
      // Cleared field: cancel any in-flight search and bring the popular list back.
      ++seqRef.current;
      setLoading(false);
      let active = true;
      void loadPopular().then((p) => {
        if (active) {
          setResults(p);
          setPopularShown(true);
        }
      });
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setPopularShown(false);
    const seq = ++seqRef.current;
    const tmo = setTimeout(() => {
      searchPlaces(term, 12)
        .then((rows) => {
          if (seq === seqRef.current) {
            setResults(rows);
            setLoading(false);
          }
        })
        .catch(() => {
          if (seq === seqRef.current) {
            setResults([]);
            setLoading(false);
          }
        });
    }, 250);
    return () => clearTimeout(tmo);
  }, [q, open]);

  const pick = (c: Place) => {
    onChange(c);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("flex w-full items-center gap-2 text-left", className)}
      >
        <span className={cn("flex-1 truncate text-[17px]", value ? "font-800 text-ink-900 dark:text-white" : "font-600 text-ink-400")}>
          {value ? placeName(value, locale) : placeholder}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />
      </button>

      <Modal open={open} onOpenChange={setOpen}>
        {/* Fixed-height dialog: the search input is pinned at the top and only the
            results scroll, so the input never jumps when the result count changes
            (0 ↔ many). Height is constant regardless of how many rows come back. */}
        <ModalContent className="flex h-[70vh] max-h-[560px] max-w-md flex-col overflow-hidden p-0">
          <ModalTitle className="sr-only">{placeholder}</ModalTitle>
          <div className="flex shrink-0 items-center gap-2 border-b border-ink-100 p-3 dark:border-ink-800">
            <Search className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("enter_city")}
              className="w-full bg-transparent text-[16px] font-700 text-ink-900 outline-none placeholder:text-ink-400 dark:text-white"
            />
            {loading && (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500" aria-hidden="true" />
            )}
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto py-1">
            {popularShown && (
              <li className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">{t("popular_cities")}</li>
            )}
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-800 text-ink-900 dark:text-white">{placeName(c, locale)}</span>
                    {placeSubtitle(c, locale) && (
                      <span className="block truncate text-[13px] font-600 text-ink-500">{placeSubtitle(c, locale)}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {!loading && q.trim() && results.length === 0 && (
              <li className="px-4 py-6 text-center text-[14px] font-600 text-ink-400">{t("no_matches")}</li>
            )}
          </ul>
        </ModalContent>
      </Modal>
    </>
  );
}
