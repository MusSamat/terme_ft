"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, Crosshair, Plane, Users, X } from "lucide-react";
import { getMapListings, type MapItem } from "@/lib/api/map";
import { ListingsMap, type MapPoint, type Viewport } from "@/components/map";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { Chip } from "@/components/ui/chip";
import { getCurrentPoint } from "@/lib/hooks/use-geolocation";
import { formatDepartureLabel } from "@/lib/utils/date";
import { routeFromParams, setRouteParams, toRoutePlace } from "@/lib/places";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/i18n.config";

const ymdKg = (offset = 0) => new Date(Date.now() + 6 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);

// Rides on a map: every trip at its driver's boarding pin, every request where
// the passenger waits (settlement centre when no pin). Server-side clustering;
// tap a bubble to zoom in, tap a marker for the listing.
export function MapScreen() {
  const t = useTranslations("map");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const mode = useAuth((s) => s.activeMode);

  const kind: "trips" | "requests" =
    sp.get("kind") === "requests" || (!sp.get("kind") && mode === "driver") ? "requests" : "trips";
  const airport = sp.get("ride") === "airport";
  const date = sp.get("date") ?? "";
  const { to } = routeFromParams((k) => sp.get(k));

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [debounced, setDebounced] = useState<Viewport | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(viewport), 300);
    return () => clearTimeout(id);
  }, [viewport]);

  const [me, setMe] = useState<MapPoint | null>(null);
  const [recenter, setRecenter] = useState<MapPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const locate = async () => {
    setLocating(true);
    const p = await getCurrentPoint();
    setLocating(false);
    setGeoDenied(!p);
    if (p) {
      setMe(p);
      setRecenter({ ...p });
    }
  };

  const { data, isFetching } = useQuery({
    queryKey: ["map", kind, airport, date, to?.id, debounced],
    queryFn: () =>
      getMapListings({
        kind,
        bbox: debounced!,
        zoom: debounced!.zoom,
        toId: to?.id ?? undefined,
        ride: airport ? "airport" : undefined,
        date: date ? `${date}T00:00:00+06:00` : undefined,
      }),
    enabled: Boolean(debounced),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const [selected, setSelected] = useState<MapItem | null>(null);
  useEffect(() => setSelected(null), [kind, airport, date, to?.id]);

  const items = data?.items ?? [];
  const markers = useMemo(
    () =>
      items.map((it) => ({
        id: it.id,
        lat: it.lat,
        lng: it.lng,
        exact: it.exact,
        label: `${it.originCity} → ${it.destinationCity}`,
      })),
    [items],
  );
  const total = items.length + (data?.clusters ?? []).reduce((a, c) => a + c.count, 0);
  const grape = kind === "requests";
  const color = grape ? "#6366F1" : "#0D9488";

  return (
    <div className="relative h-[100dvh] w-full md:h-[calc(100dvh-64px)]">
      <ListingsMap
        items={markers}
        clusters={data?.clusters ?? []}
        onViewport={setViewport}
        onSelect={(id) => setSelected(items.find((i) => i.id === id) ?? null)}
        me={me}
        recenter={recenter}
        color={color}
      />

      {/* Controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3">
        <div className="pointer-events-auto mx-auto max-w-[640px] space-y-2 rounded-3xl bg-white/95 p-3 shadow-lift backdrop-blur dark:bg-ink-900/95">
          <div className="grid grid-cols-2 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800">
            {(["trips", "requests"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setParam({ kind: k })}
                aria-pressed={kind === k}
                className={cn(
                  "h-9 rounded-xl text-[13.5px] font-900 transition-colors",
                  kind === k
                    ? k === "requests"
                      ? "bg-grape-500 text-white"
                      : "bg-brand-600 text-white"
                    : "text-ink-500 dark:text-ink-400",
                )}
              >
                {k === "trips" ? t("tab_trips") : t("tab_requests")}
              </button>
            ))}
          </div>
          <CityAutocomplete
            compact
            value={to}
            onChange={(v) => {
              const next = new URLSearchParams(sp);
              setRouteParams(next, null, v ? toRoutePlace(v) : null);
              router.replace(`${pathname}?${next.toString()}`, { scroll: false });
            }}
            placeholder={t("to_placeholder")}
          />
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            <Chip kind="filter" selected={!date} onClick={() => setParam({ date: null })}>
              {t("any_day")}
            </Chip>
            <Chip kind="filter" selected={date === ymdKg(0)} onClick={() => setParam({ date: ymdKg(0) })}>
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {t("today")}
            </Chip>
            <Chip kind="filter" selected={date === ymdKg(1)} onClick={() => setParam({ date: ymdKg(1) })}>
              {t("tomorrow")}
            </Chip>
            <Chip kind="filter" selected={airport} onClick={() => setParam({ ride: airport ? null : "airport" })}>
              <Plane className="h-3.5 w-3.5" aria-hidden="true" /> {t("airport")}
            </Chip>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[calc(108px+env(safe-area-inset-bottom))] right-3 z-[500] flex flex-col items-end gap-2 md:bottom-6">
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-[12.5px] font-800 text-ink-700 shadow-card dark:bg-ink-900/95 dark:text-ink-200">
          {isFetching ? t("loading") : t("count", { n: total })}
        </span>
        <button
          type="button"
          onClick={() => void locate()}
          disabled={locating}
          aria-label={t("my_location")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-lift disabled:opacity-60 dark:bg-ink-900"
        >
          <Crosshair className={cn("h-5 w-5", locating && "animate-pulse")} aria-hidden="true" />
        </button>
        {geoDenied && (
          <span className="max-w-[220px] rounded-xl bg-white/95 px-3 py-2 text-[12px] font-700 text-coral-600 shadow-card dark:bg-ink-900/95">
            {t("geo_denied")}
          </span>
        )}
      </div>

      {selected && (
        <div className="absolute inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-[600] px-3 md:bottom-6">
          <div className="mx-auto flex max-w-[480px] items-center gap-3 rounded-3xl bg-white p-4 shadow-lift dark:bg-ink-900">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-[16px] font-900 text-ink-900 dark:text-white">
                {selected.originCity}
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                {selected.destinationCity}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-[13px] font-700 text-ink-500">
                {formatDepartureLabel(selected.departureAt, locale)}
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {selected.seats}
                </span>
                {selected.price != null && <span>{selected.price.toLocaleString("ru-RU")} {t("som")}</span>}
              </p>
              {!selected.exact && <p className="mt-0.5 text-[12px] font-600 text-ink-400">{t("city_point")}</p>}
            </div>
            <Link
              href={grape ? `/requests/${selected.id}` : `/trips/${selected.id}`}
              className={cn(
                "shrink-0 rounded-2xl px-4 py-2.5 text-[14px] font-900 text-white",
                grape ? "bg-grape-500 hover:bg-grape-600" : "bg-brand-600 hover:bg-brand-500",
              )}
            >
              {t("open")}
            </Link>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label={t("close")}
              className="shrink-0 rounded-full p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
