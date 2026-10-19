"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Crosshair } from "lucide-react";
import { ListingsMap, type FitPadding, type MapCommand, type MapListing } from "@/components/map";
import { clusterPins, haversineKm, inKg, routeFitPoints, sortByDistance, type LatLng } from "@/lib/geo";
import { formatDepartureLabel } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/i18n.config";
import type { MapRouteParams } from "@/lib/api/map";
import { useMapLocation } from "./use-map-location";
import { GeoBanner, LocationCard } from "./location-prompt";
import { NearbyPanel, type ResultPin } from "./nearby-panel";
import { useRouteMap } from "./use-route-map";

const USER_ZOOM = 13;
const PIN_ZOOM = 15;
// The user dot joins the framing only when they are around the origin.
const NEAR_ORIGIN_KM = 50;
// Overlays over the map: the «Рядом» sheet (below lg) / the left panel (lg).
const FIT_SHEET: FitPadding = { topLeft: [32, 32], bottomRight: [32, 220] };
const FIT_WIDE: FitPadding = { topLeft: [390, 40], bottomRight: [80, 40] };

/**
 * «Карта» view of a route's results: one pin per listing at its pickup point,
 * the user dot, and the same results as a «Рядом» list (nearest first when the
 * position is known, else by time). Opening a result is the feed's job.
 * All of the route's listings come from GET /map/route; the loaded list pages
 * stand in until it answers (and for legacy name-only routes without ids).
 */
export function RouteResultsMap({
  kind,
  query,
  pins: listPins,
  origin,
  fitKey,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
  landmark,
}: {
  kind: "trips" | "requests";
  /** GET /map/route filters (same as the list); null without place ids. */
  query: MapRouteParams | null;
  /** Loaded list pages, in departure order — the fallback. */
  pins: Omit<ResultPin, "distanceKm">[];
  /** Origin settlement centre (frames the map without results / with the user). */
  origin: LatLng | null;
  /** Changes when the search (route, date, filters) changes → refit. */
  fitKey: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (id: string) => void;
  /** The airport of a transfer route — a plane pin. */
  landmark?: LatLng & { label: string };
}) {
  const t = useTranslations("map");
  const locale = useLocale() as Locale;
  const loc = useMapLocation();
  const meInKg = loc.me && inKg(loc.me) ? loc.me : null;
  const routeMap = useRouteMap(query, locale);
  const live = routeMap.pins !== null;
  const pins = routeMap.pins ?? listPins;

  const rows: ResultPin[] = useMemo(
    () => (meInKg ? sortByDistance(pins, meInKg) : pins.map((p) => ({ ...p, distanceKm: null }))),
    [pins, meInKg],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [zoom, setZoom] = useState(7);
  const [command, setCommand] = useState<MapCommand | null>(null);
  const userMoved = useRef(false);
  useEffect(() => setSelectedId(null), [fitKey]);

  // Frame pickups (+ the user when near the origin): per search, and once more
  // when the first fix arrives — unless the user has moved the map since.
  const meNear = Boolean(meInKg && origin && haversineKm(meInKg, origin) <= NEAR_ORIGIN_KM);
  const fitted = useRef("");
  useEffect(() => {
    const key = `${fitKey}|${pins.length > 0}|${meNear}|${live}`;
    if (fitted.current === key) return;
    if (fitted.current.split("|")[0] !== fitKey) userMoved.current = false;
    if (userMoved.current) return;
    fitted.current = key;
    const points = routeFitPoints(pins, origin, meNear ? meInKg : null, NEAR_ORIGIN_KM);
    if (landmark) points.push({ lat: landmark.lat, lng: landmark.lng });
    if (points.length === 1) setCommand({ kind: "center", ...points[0]!, zoom: pins.length ? PIN_ZOOM : 12, animate: false });
    else if (points.length > 1) setCommand({ kind: "fit", points, maxZoom: PIN_ZOOM });
    // Keyed by search / first results / full route results / first nearby fix only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, pins.length > 0, meNear, live]);

  // «Разрешить» / crosshair → show the fresh position.
  useEffect(() => {
    if (!loc.requestSeq || !loc.me || !inKg(loc.me)) return;
    setCommand({ kind: "center", lat: loc.me.lat, lng: loc.me.lng, zoom: USER_ZOOM });
    // Only on a fresh user-requested fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.requestSeq]);

  const { singles, clusters } = useMemo(
    () => clusterPins(rows.filter((r) => r.id !== selectedId), zoom),
    [rows, selectedId, zoom],
  );
  const markers = useMemo(() => {
    const toMarker = (p: ResultPin): MapListing => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      badge: p.seats,
      approx: !p.exact,
      label: `${p.originName} → ${p.destinationName}, ${formatDepartureLabel(p.departureAt, locale)}`,
    });
    const list = singles.map(toMarker);
    const sel = selectedId ? rows.find((r) => r.id === selectedId) : undefined;
    if (sel) list.push(toMarker(sel));
    return list;
  }, [singles, rows, selectedId, locale]);

  const onMarkerSelect = useCallback((id: string) => setSelectedId(id), []);
  const onClusterOpen = useCallback((ids: string[]) => {
    setSelectedId(ids[0] ?? null);
    setSheetOpen(true);
  }, []);
  const onPick = useCallback((p: ResultPin) => {
    setSelectedId(p.id);
    setSheetOpen(false);
    setCommand({ kind: "center", lat: p.lat, lng: p.lng, zoom: PIN_ZOOM });
  }, []);
  const onViewport = useCallback((v: { zoom: number }) => setZoom(v.zoom), []);
  const onInteract = useCallback(() => {
    userMoved.current = true;
  }, []);
  const clusterLabel = useCallback((n: number) => t("cluster_aria", { n }), [t]);

  const onRecenter = () => {
    if (meInKg) {
      setCommand({ kind: "center", lat: meInKg.lat, lng: meInKg.lng, zoom: USER_ZOOM });
      loc.refresh();
    } else if (loc.perm === "granted") loc.request();
    else loc.openCard();
  };

  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const recenterButton = (
    <button
      type="button"
      onClick={onRecenter}
      disabled={loc.locating}
      aria-label={t("my_location")}
      className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 dark:bg-ink-900"
    >
      <Crosshair className={cn("h-5 w-5", loc.locating && "animate-pulse")} aria-hidden="true" />
    </button>
  );

  const waiting = loc.perm === "checking" || (loc.perm === "granted" && !loc.me && loc.locating);
  const showCard = loc.cardOpen;
  const showBanner = !loc.me && !waiting && !showCard;

  return (
    <div className="relative isolate h-[calc(100dvh-300px)] min-h-[440px] w-full overflow-hidden rounded-3xl bg-ink-100 shadow-card dark:bg-ink-800 lg:h-[calc(100dvh-260px)]">
      <ListingsMap
        items={markers}
        clusters={clusters}
        onClusterOpen={onClusterOpen}
        glyph={kind === "trips" ? "car" : "passenger"}
        selectedId={selectedId}
        onSelect={onMarkerSelect}
        onViewport={onViewport}
        onInteract={onInteract}
        me={loc.me}
        command={command}
        fitPadding={wide ? FIT_WIDE : FIT_SHEET}
        clusterLabel={clusterLabel}
        landmark={landmark ? { ...landmark, glyph: "plane" } : undefined}
      />

      <div className="pointer-events-none absolute inset-0 z-[500] flex flex-col gap-2 p-2 lg:right-auto lg:w-[370px]">
        {showBanner && <GeoBanner text={t("banner_enable")} action={t("banner_enable_btn")} onAction={loc.openCard} />}
        <div className="flex-1 lg:hidden" />
        <div className="flex justify-end lg:hidden">{recenterButton}</div>
        {!(showCard && !wide) && (
          <div className="flex min-h-0 flex-col lg:flex-1">
            <NearbyPanel
              rows={rows}
              kind={kind}
              selectedId={selectedId}
              expanded={sheetOpen}
              onToggle={() => setSheetOpen((v) => !v)}
              onPick={onPick}
              onOpen={onOpen}
              hint={meInKg ? t("nearby_sorted_hint") : t("nearby_sorted_time")}
              notes={[routeMap.nearby && t("route_nearby"), routeMap.truncated && t("route_truncated")].filter(
                (n): n is string => Boolean(n),
              )}
              hasMore={!live && hasMore}
              loadingMore={loadingMore}
              onLoadMore={onLoadMore}
            />
          </div>
        )}
      </div>

      <div className="absolute bottom-3 right-3 z-[500] hidden lg:block">{recenterButton}</div>

      {showCard && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[700] p-2 lg:left-[380px] lg:p-4">
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
