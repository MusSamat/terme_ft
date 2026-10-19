"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Crosshair, Plane } from "lucide-react";
import { getMapListings, type MapItem, type MapQuery } from "@/lib/api/map";
import { ListingsMap, type FitPadding, type MapCommand, type MapListing, type MapPoint, type Viewport } from "@/components/map";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { Chip } from "@/components/ui/chip";
import { CarGlyph } from "@/components/icons/car-glyph";
import { PassengerGlyph } from "@/components/icons/passenger-glyph";
import { findNearest, haversineKm, inKg, KG_BBOX, type LatLng } from "@/lib/geo";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { formatDepartureLabel } from "@/lib/utils/date";
import { placeName, routeFromParams, setRouteParams, toRoutePlace } from "@/lib/places";
import { readLastRoute } from "@/lib/recent-routes";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/i18n.config";
import { useMapLocation } from "./use-map-location";
import { GeoBanner, LocationCard } from "./location-prompt";
import { NearbyPanel, type NearbyItem } from "./nearby-panel";

const ymdKg = (offset = 0) =>
  new Date(Date.now() + 6 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);

// Unclustered on the server from z14 — the nearby list needs single listings.
const NEARBY_ZOOM = 14;
const USER_ZOOM = 13;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
// Overlays over the map: filters + sheet (mobile), the left panel (lg).
const FIT_MOBILE: FitPadding = { topLeft: [32, 210], bottomRight: [32, 330] };
const FIT_WIDE: FitPadding = { topLeft: [430, 48], bottomRight: [80, 48] };

// Rides on a map, nearest first: the user's position (asked via a
// pre-permission card, never auto-prompted) or the last searched origin city;
// the «Рядом» list widens 10 → 30 → 100 km → whole country until it finds some.
export function MapScreen() {
  const t = useTranslations("map");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const mode = useAuth((s) => s.activeMode);

  const kind: MapQuery["kind"] =
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

  const filters = useMemo(
    () => ({
      kind,
      toId: to?.id ?? undefined,
      ride: airport ? ("airport" as const) : undefined,
      date: date ? `${date}T00:00:00+06:00` : undefined,
    }),
    [kind, to?.id, airport, date],
  );

  const loc = useMapLocation();
  const meInKg = loc.me && inKg(loc.me) ? loc.me : null;

  // Fallback centre: last searched origin (if the directory gave coordinates).
  const [fallback, setFallback] = useState<(LatLng & { name: string }) | null>(null);
  useEffect(() => {
    const from = readLastRoute()?.from;
    if (from?.lat != null && from.lng != null) setFallback({ lat: from.lat, lng: from.lng, name: placeName(from, locale) });
  }, [locale]);

  // ── Camera ──
  const [command, setCommand] = useState<MapCommand | null>(null);
  const userMoved = useRef(false);
  const centered = useRef<"none" | "fallback" | "me">("none");
  const onInteract = useCallback(() => {
    userMoved.current = true;
  }, []);

  useEffect(() => {
    if (!meInKg || centered.current === "me" || userMoved.current) return;
    setCommand({ kind: "center", lat: meInKg.lat, lng: meInKg.lng, zoom: USER_ZOOM, animate: centered.current !== "none" });
    centered.current = "me";
  }, [meInKg]);

  useEffect(() => {
    if (!loc.requestSeq || !loc.me) return;
    userMoved.current = false;
    if (inKg(loc.me)) {
      setCommand({ kind: "center", lat: loc.me.lat, lng: loc.me.lng, zoom: USER_ZOOM });
      centered.current = "me";
    }
    // Only on a fresh user-requested fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.requestSeq]);

  const waitingForFix = loc.perm === "checking" || (loc.perm === "granted" && !loc.me && loc.locating);
  useEffect(() => {
    if (waitingForFix || meInKg || centered.current !== "none" || !fallback) return;
    setCommand({ kind: "center", lat: fallback.lat, lng: fallback.lng, zoom: 11, animate: false });
    centered.current = "fallback";
  }, [waitingForFix, meInKg, fallback]);

  // ── Viewport listings (markers + clusters) ──
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const debounced = useDebounce(viewport, 300);
  const view = useQuery({
    queryKey: ["map", filters, debounced],
    queryFn: () => getMapListings({ ...filters, bbox: debounced!, zoom: debounced!.zoom }),
    enabled: Boolean(debounced),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  // ── Nearby list (radius expansion around the reference point) ──
  const ref = meInKg ?? (waitingForFix ? null : fallback);
  const refKey = ref ? `${round3(ref.lat)},${round3(ref.lng)}` : waitingForFix ? "wait" : "country";
  const nearby = useQuery({
    queryKey: ["map-nearby", filters, refKey],
    queryFn: async () => {
      const fetchBox = (bbox: MapQuery["bbox"]) =>
        getMapListings({ ...filters, bbox, zoom: NEARBY_ZOOM }).then((r) => r.items);
      if (ref) return findNearest<MapItem>(ref, fetchBox);
      return { items: (await fetchBox(KG_BBOX)).map((i) => ({ ...i, distanceKm: null })), radiusKm: null, expanded: false };
    },
    enabled: refKey !== "wait",
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  // Widened search → show the user (or city) together with the first results.
  useEffect(() => {
    const r = nearby.data;
    if (!r?.expanded || !ref || userMoved.current || nearby.isPlaceholderData) return;
    const first = r.items.slice(0, 3).map((i): MapPoint => ({ lat: i.lat, lng: i.lng }));
    if (first.length) setCommand({ kind: "fit", points: [ref, ...first], maxZoom: USER_ZOOM });
    // Once per result set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearby.data]);

  // ── Selection ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => setSelectedId(null), [filters]);

  const nearbyRows: NearbyItem[] = useMemo(() => nearby.data?.items ?? [], [nearby.data]);
  const viewItems = useMemo(() => view.data?.items ?? [], [view.data]);

  // A marker outside the nearby set still gets a row (pinned on top).
  const rows = useMemo(() => {
    if (!selectedId || nearbyRows.some((r) => r.id === selectedId)) return nearbyRows;
    const it = viewItems.find((i) => i.id === selectedId);
    if (!it) return nearbyRows;
    return [{ ...it, distanceKm: ref ? haversineKm(ref, it) : null }, ...nearbyRows];
  }, [selectedId, nearbyRows, viewItems, ref]);

  const markers = useMemo(() => {
    const toMarker = (it: MapItem): MapListing => ({
      id: it.id,
      lat: it.lat,
      lng: it.lng,
      badge: it.seats,
      label: `${it.originCity} → ${it.destinationCity}, ${formatDepartureLabel(it.departureAt, locale)}`,
    });
    const list = viewItems.map(toMarker);
    // A row picked from the list keeps its pin even while the viewport query lags.
    const sel = selectedId && !viewItems.some((i) => i.id === selectedId) && rows.find((r) => r.id === selectedId);
    if (sel) list.push(toMarker(sel));
    return list;
  }, [viewItems, rows, selectedId, locale]);

  const onMarkerSelect = useCallback((id: string) => setSelectedId(id), []);
  const onPick = useCallback((it: NearbyItem) => {
    setSelectedId(it.id);
    setSheetOpen(false);
    setCommand({ kind: "center", lat: it.lat, lng: it.lng, zoom: NEARBY_ZOOM });
  }, []);
  const clusterLabel = useCallback((n: number) => t("cluster_aria", { n }), [t]);

  const onRecenter = () => {
    if (loc.me && inKg(loc.me)) {
      userMoved.current = false;
      setCommand({ kind: "center", lat: loc.me.lat, lng: loc.me.lng, zoom: USER_ZOOM });
      loc.refresh();
    } else if (loc.perm === "granted") {
      loc.request();
    } else {
      loc.openCard();
    }
  };

  // lg: the side panel covers the map's left 400px.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const r = nearby.data;
  const chip =
    r?.expanded && ref && r.items[0]?.distanceKm != null
      ? t("nearest_chip", { km: Math.max(1, Math.ceil(r.items[0].distanceKm)) })
      : null;
  const hint = meInKg ? t("nearby_sorted_hint") : ref && fallback ? t("nearby_sorted_city", { city: fallback.name }) : null;
  const showCard = loc.cardOpen;
  const banner =
    loc.me && !meInKg
      ? { text: t("outside_kg") }
      : !loc.me && !waitingForFix && !showCard
        ? { text: t("banner_enable"), action: t("banner_enable_btn"), onAction: loc.openCard }
        : null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden md:h-[calc(100dvh-64px)]">
      <ListingsMap
        items={markers}
        clusters={view.data?.clusters ?? []}
        glyph={kind === "trips" ? "car" : "passenger"}
        selectedId={selectedId}
        onSelect={onMarkerSelect}
        onViewport={setViewport}
        onInteract={onInteract}
        me={loc.me}
        command={command}
        fitPadding={wide ? FIT_WIDE : FIT_MOBILE}
        clusterLabel={clusterLabel}
      />

      {/* One column: filters on top, «Рядом» at the bottom (mobile) / filling the left panel (lg). */}
      <div className="pointer-events-none absolute inset-0 z-[500] flex flex-col gap-2 p-3 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-3 lg:right-auto lg:w-[400px]">
        <div className="pointer-events-auto mx-auto w-full max-w-[640px] space-y-2 rounded-3xl bg-white/95 p-3 shadow-lift backdrop-blur dark:bg-ink-900/95">
          <div role="group" aria-label={t("tab_trips") + " / " + t("tab_requests")} className="grid grid-cols-2 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800">
            {(["trips", "requests"] as const).map((k) => {
              const Glyph = k === "trips" ? CarGlyph : PassengerGlyph;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setParam({ kind: k })}
                  aria-pressed={kind === k}
                  className={cn(
                    "flex h-9 items-center justify-center gap-1.5 rounded-xl text-[13.5px] font-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    kind === k ? "bg-brand-600 text-white" : "text-ink-500 dark:text-ink-400",
                  )}
                >
                  <Glyph size={18} />
                  {k === "trips" ? t("tab_trips") : t("tab_requests")}
                </button>
              );
            })}
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

        {banner && (
          <div className="mx-auto w-full max-w-[640px]">
            <GeoBanner {...banner} />
          </div>
        )}

        <div className="flex-1 lg:hidden" />

        <div className="flex justify-end lg:fixed lg:bottom-6 lg:right-6">
          <button
            type="button"
            onClick={onRecenter}
            disabled={loc.locating}
            aria-label={t("my_location")}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 dark:bg-ink-900"
          >
            <Crosshair className={cn("h-5 w-5", loc.locating && "animate-pulse")} aria-hidden="true" />
          </button>
        </div>

        {!(showCard && !wide) && (
          <div className="mx-auto flex min-h-0 w-full max-w-[640px] flex-col lg:flex-1">
            <NearbyPanel
              rows={rows}
              kind={kind}
              selectedId={selectedId}
              expanded={sheetOpen}
              onToggle={() => setSheetOpen((v) => !v)}
              onPick={onPick}
              loading={!nearby.data && (nearby.isFetching || refKey === "wait")}
              error={nearby.isError && !nearby.isFetching}
              onRetry={() => void nearby.refetch()}
              chip={chip}
              hint={hint}
            />
          </div>
        )}
      </div>

      {showCard && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[700] px-3 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-6 lg:left-[400px]">
          <LocationCard
            denied={loc.perm === "denied"}
            failed={loc.failed}
            locating={loc.locating}
            onAllow={loc.request}
            onLater={loc.dismissCard}
          />
        </div>
      )}
    </div>
  );
}
