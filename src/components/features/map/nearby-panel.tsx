"use client";

import { memo, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ChevronUp } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import { formatDepartureLabel } from "@/lib/utils/date";
import { CarGlyph } from "@/components/icons/car-glyph";
import { PassengerGlyph } from "@/components/icons/passenger-glyph";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/i18n.config";

/** One route result on the map: its pickup point (or the origin settlement). */
export interface ResultPin {
  id: string;
  lat: number;
  lng: number;
  /** false = no pin, the point is the settlement centre. */
  exact: boolean;
  /** Already in the UI language. */
  originName: string;
  destinationName: string;
  departureAt: string;
  seats: number;
  price: number | null;
  distanceKm: number | null;
}

/**
 * «Рядом»: the route's results — bottom sheet below lg (peek = header + 1–2
 * rows, or the selected row), a side panel from lg. Nearest first when the
 * user's position is known, otherwise by departure time.
 */
export function NearbyPanel({
  rows,
  kind,
  selectedId,
  expanded,
  onToggle,
  onPick,
  onOpen,
  hint,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  rows: ResultPin[];
  kind: "trips" | "requests";
  selectedId: string | null;
  expanded: boolean;
  onToggle: () => void;
  onPick: (item: ResultPin) => void;
  onOpen: (id: string) => void;
  hint: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const t = useTranslations("map");
  const selected = selectedId ? rows.find((r) => r.id === selectedId) : undefined;
  const peekRows = selected ? [selected] : rows.slice(0, 2);
  const listRef = useRef<HTMLUListElement>(null);

  // Marker tapped → bring its row into view.
  useEffect(() => {
    if (!selectedId) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, expanded]);

  return (
    <section
      aria-labelledby="map-nearby-title"
      className="pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-t-4xl bg-white shadow-lift dark:bg-ink-900 md:rounded-4xl lg:flex-1"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="map-nearby-list"
        aria-label={expanded ? t("sheet_collapse") : t("sheet_expand")}
        className="flex w-full justify-center pb-1 pt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 lg:hidden"
      >
        <span className="h-1.5 w-10 rounded-full bg-ink-200 dark:bg-ink-700" aria-hidden="true" />
      </button>
      <header className="flex items-center gap-2 px-4 pb-2 lg:pt-4">
        <div className="min-w-0 flex-1">
          <h2 id="map-nearby-title" className="text-[17px] font-900 text-ink-900 dark:text-white">
            {t("nearby_title")}
            <span className="ml-2 text-[13px] font-700 text-ink-400" aria-live="polite">
              {t("nearby_found", { n: rows.length })}
            </span>
          </h2>
          <p className="truncate text-[12px] font-600 text-ink-400">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-hidden="true"
          tabIndex={-1}
          className="shrink-0 rounded-full p-1 text-ink-400 lg:hidden"
        >
          <ChevronUp className={cn("h-5 w-5 transition-transform", expanded && "rotate-180")} />
        </button>
      </header>

      <ul
        id="map-nearby-list"
        ref={listRef}
        className={cn(
          "min-h-0 space-y-1 overflow-y-auto overscroll-contain px-2 pb-3",
          expanded ? "max-h-[50dvh] md:max-h-[45dvh]" : "max-h-none",
          "lg:max-h-none lg:flex-1",
        )}
      >
        {/* Below lg the collapsed sheet shows only the peek rows; lg shows all. */}
        {rows.map((r) => (
          <li key={r.id} data-id={r.id} className={cn(!expanded && !peekRows.includes(r) && "hidden lg:block")}>
            <NearbyRow item={r} kind={kind} selected={r.id === selectedId} onPick={onPick} onOpen={onOpen} />
          </li>
        ))}
        {hasMore && (
          <li className={cn(!expanded && "hidden lg:block")}>
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full rounded-2xl py-2.5 text-[13px] font-800 text-brand-700 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 dark:text-brand-300 dark:hover:bg-ink-800"
            >
              {loadingMore ? t("loading") : t("load_more")}
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}

const NearbyRow = memo(function NearbyRow({
  item,
  kind,
  selected,
  onPick,
  onOpen,
}: {
  item: ResultPin;
  kind: "trips" | "requests";
  selected: boolean;
  onPick: (item: ResultPin) => void;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("map");
  const locale = useLocale() as Locale;
  const Glyph = kind === "trips" ? CarGlyph : PassengerGlyph;
  const distance =
    item.distanceKm != null ? formatDistance(item.distanceKm, { km: t("km"), m: t("m") }) : null;
  return (
    <div
      className={cn(
        "rounded-2xl transition-colors",
        selected ? "bg-brand-50 ring-2 ring-brand-600 dark:bg-brand-500/15" : "hover:bg-ink-100 dark:hover:bg-ink-800",
      )}
    >
      <button
        type="button"
        onClick={() => onPick(item)}
        aria-pressed={selected}
        aria-label={`${item.originName} → ${item.destinationName}${distance ? `, ${distance}` : ""} — ${t("show_on_map")}`}
        className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white",
            selected ? "bg-ink-900 dark:bg-ink-700" : "bg-brand-600",
          )}
        >
          <Glyph size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 truncate text-[15px] font-900 text-ink-900 dark:text-white">
            <span className="truncate">{item.originName}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
            <span className="truncate">{item.destinationName}</span>
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] font-700 text-ink-500">
            <span>{formatDepartureLabel(item.departureAt, locale)}</span>
            <span>{kind === "trips" ? t("seats_free", { n: item.seats }) : t("passengers", { n: item.seats })}</span>
            {item.price != null && (
              <span>
                {item.price.toLocaleString("ru-RU")} {t("som")}
              </span>
            )}
          </span>
        </span>
        {distance && (
          <span className="shrink-0 text-[13px] font-900 tabular-nums text-brand-700 dark:text-brand-300">{distance}</span>
        )}
      </button>
      {selected && (
        <div className="flex items-center gap-2 px-2.5 pb-2.5">
          <p className="min-w-0 flex-1 text-[11.5px] font-600 text-ink-500">{!item.exact && t("city_point")}</p>
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="shrink-0 rounded-xl bg-ink-900 px-4 py-2 text-[13.5px] font-900 text-white hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-white dark:text-ink-900"
          >
            {t("open")}
          </button>
        </div>
      )}
    </div>
  );
});
