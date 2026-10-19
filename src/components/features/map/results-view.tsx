"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ResultsView = "list" | "map";

// Last choice of this tab session; the URL (?view=) wins so links are shareable.
const KEY = "terme_results_view";

export function useResultsView(): [ResultsView, (v: ResultsView) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [stored, setStored] = useState<ResultsView>("list");
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "map") setStored("map");
    } catch {
      /* private mode */
    }
  }, []);
  const url = sp.get("view");
  const view: ResultsView = url === "map" || url === "list" ? url : stored;
  const set = useCallback(
    (v: ResultsView) => {
      try {
        sessionStorage.setItem(KEY, v);
      } catch {
        /* private mode */
      }
      setStored(v);
      const next = new URLSearchParams(sp);
      next.set("view", v);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [sp, router, pathname],
  );
  return [view, set];
}

/** «Список | Карта» segmented toggle above route results. */
export function ResultsViewToggle({ view, onChange }: { view: ResultsView; onChange: (v: ResultsView) => void }) {
  const t = useTranslations("map");
  return (
    <div role="group" aria-label={t("view_toggle_aria")} className="inline-grid grid-cols-2 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800">
      {(["list", "map"] as const).map((v) => {
        const Icon = v === "list" ? List : MapIcon;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={view === v}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-xl px-4 text-[13.5px] font-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              view === v ? "bg-white text-ink-900 shadow-card dark:bg-ink-900 dark:text-white" : "text-ink-500 dark:text-ink-400",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {v === "list" ? t("view_list") : t("view_map")}
          </button>
        );
      })}
    </div>
  );
}
