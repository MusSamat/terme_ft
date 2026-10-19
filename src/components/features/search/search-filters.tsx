"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FiltersBody } from "./_components/filters-body";

export const FILTER_KEYS = [
  "sort", "only_verified", "luggage", "min_price", "max_price", "min_rating", "date",
  "women_only", "no_smoking", "pets",
  // «Весь салон» (seats=4) from the hub — reset must be able to clear it.
  "seats",
] as const;

function FiltersHeader() {
  const t = useTranslations("search_filters");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const hasActive = FILTER_KEYS.some((k) => params.has(k));

  const reset = useCallback(() => {
    const next = new URLSearchParams(params);
    FILTER_KEYS.forEach((k) => next.delete(k));
    next.delete("cursor");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }, [params, pathname, router]);

  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[16px] font-900 text-ink-900 dark:text-white">{t("title")}</span>
      {hasActive && (
        <button
          type="button"
          onClick={reset}
          className="text-[14px] font-800 text-brand-600 hover:text-brand-700 dark:text-brand-300"
        >
          {t("reset")}
        </button>
      )}
    </div>
  );
}

interface SearchFiltersProps {
  className?: string;
}

export function SearchFilters({ className }: SearchFiltersProps) {
  return (
    <div className={className}>
      <FiltersHeader />
      <FiltersBody />
    </div>
  );
}
