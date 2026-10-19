"use client";

// Client-only Leaflet maps (imported through ./index with ssr:false). OSM tiles,
// HTML div icons — no image assets, crisp on every DPR.
import { memo, useEffect, useMemo, useRef, type RefObject } from "react";
import L, { type LatLngTuple } from "leaflet";
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { glyphPathsMarkup, type GlyphKind } from "@/components/icons/glyphs";
import { CLUSTER_MAX_ZOOM, type PinCluster } from "@/lib/geo";
import "leaflet/dist/leaflet.css";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
// Whole Kyrgyzstan.
export const KG_CENTER: LatLngTuple = [41.4, 74.6];

function dot(color: string, size = 16) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function pin(color: string) {
  return L.divIcon({
    className: "",
    html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg"><path d="M17 43C17 43 32 27.6 32 17A15 15 0 0 0 2 17C2 27.6 17 43 17 43Z" fill="${color}" stroke="#fff" stroke-width="3"/><circle cx="17" cy="17" r="5.5" fill="#fff"/></svg>`,
    iconSize: [34, 44],
    iconAnchor: [17, 43],
  });
}

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
}

// ─── Route map (trip / request detail) ─────────────────────────────────
function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  // Refit only when the coordinates change — not on every parent re-render
  // (refetches would otherwise snap the map back while the user pans).
  const key = points.map((p) => p.join(",")).join(";");
  useEffect(() => {
    if (points.length === 1) map.setView(points[0]!, 13);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [36, 36] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export function RouteMapInner({
  origin,
  destination,
  stops = [],
  className,
}: {
  origin: MapPoint;
  destination?: MapPoint | null;
  stops?: MapPoint[];
  className?: string;
}) {
  const points = useMemo<LatLngTuple[]>(
    () => [
      [origin.lat, origin.lng],
      ...stops.map((s): LatLngTuple => [s.lat, s.lng]),
      ...(destination ? [[destination.lat, destination.lng] as LatLngTuple] : []),
    ],
    [origin, destination, stops],
  );
  return (
    <div className={className ?? "isolate h-56 w-full overflow-hidden rounded-2xl"}>
      <MapContainer center={points[0]} zoom={11} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
        <FitBounds points={points} />
        {points.length > 1 && (
          <Polyline positions={points} pathOptions={{ color: "#0D9488", weight: 3, dashArray: "6 6" }} />
        )}
        <Marker position={points[0]!} icon={pin("#0D9488")}>
          {origin.label && <Tooltip direction="top" offset={[0, -40]}>{origin.label}</Tooltip>}
        </Marker>
        {stops.map((s, i) => (
          <Marker key={i} position={[s.lat, s.lng]} icon={dot("#78716C", 12)}>
            {s.label && <Tooltip direction="top">{s.label}</Tooltip>}
          </Marker>
        ))}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={pin("#F59E0B")}>
            {destination.label && <Tooltip direction="top" offset={[0, -40]}>{destination.label}</Tooltip>}
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

// ─── Point picker (create forms) ───────────────────────────────────────
function ClickToSet({ onPick }: { onPick: (p: MapPoint) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FlyTo({ point, zoom }: { point: MapPoint; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), zoom), { duration: 0.6 });
  }, [map, point.lat, point.lng, zoom]);
  return null;
}

export function PointPickerInner({
  value,
  center,
  onChange,
  color = "#0D9488",
  className,
}: {
  value: MapPoint | null;
  /** Where to look before a point is set (the chosen settlement). */
  center: MapPoint;
  onChange: (p: MapPoint) => void;
  color?: string;
  className?: string;
}) {
  const icon = useMemo(() => pin(color), [color]);
  const markerRef = useRef<L.Marker>(null);
  const focus = value ?? center;
  return (
    <div className={className ?? "isolate h-72 w-full overflow-hidden rounded-2xl"}>
      <MapContainer center={[focus.lat, focus.lng]} zoom={value ? 15 : 12} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
        <ClickToSet onPick={onChange} />
        <FlyTo point={focus} zoom={value ? 15 : 12} />
        {value && (
          <Marker
            ref={markerRef}
            position={[value.lat, value.lng]}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: () => {
                const ll = markerRef.current?.getLatLng();
                if (ll) onChange({ lat: ll.lat, lng: ll.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

// ─── Route results map ───────────────────────────────────────────────
export interface MapListing {
  id: string;
  lat: number;
  lng: number;
  /** Accessible name + hover tooltip («Бишкек → Ош, 14:30»). */
  label: string;
  /** Free seats (trips) / passengers (requests); hidden when null. */
  badge: number | null;
}

export interface Viewport {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
}

export interface MeLocation extends MapPoint {
  accuracy?: number;
}

/** Map area hidden under overlays (filters, sheet, side panel) when fitting bounds. */
export interface FitPadding {
  topLeft: [number, number];
  bottomRight: [number, number];
}

const DEFAULT_FIT_PADDING: FitPadding = { topLeft: [48, 48], bottomRight: [48, 48] };

/** One-shot camera instruction; a new object identity re-runs it. */
export type MapCommand =
  | { kind: "center"; lat: number; lng: number; zoom: number; animate?: boolean }
  | { kind: "fit"; points: MapPoint[]; maxZoom?: number };

// divIcons are cached per look so re-renders never rebuild DOM for unchanged pins.
const iconCache = new Map<string, L.DivIcon>();

function listingIcon(glyph: GlyphKind, badge: number | null, selected: boolean): L.DivIcon {
  const key = `${glyph}|${badge ?? ""}|${selected ? 1 : 0}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const badgeHtml = badge != null ? `<span class="tm-pin__badge">${badge > 99 ? "99+" : badge}</span>` : "";
    icon = L.divIcon({
      className: "",
      // Ø40 circle (2.5px white ring) + 8px pointer; the tip is the coordinate.
      html: `<div class="tm-pin${selected ? " tm-pin--sel" : ""}"><svg width="40" height="48" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 47 L13.3 37.5 A18.75 18.75 0 1 1 26.7 37.5 Z" fill="currentColor" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><svg class="tm-pin__glyph" x="9" y="9" width="22" height="22" viewBox="0 0 24 24">${glyphPathsMarkup(glyph)}</svg></svg>${badgeHtml}</div>`,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
      tooltipAnchor: [0, -48],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

function clusterIcon(count: number): L.DivIcon {
  const size = Math.round(Math.min(52, 36 + 5.4 * Math.log10(Math.max(1, count))));
  return L.divIcon({
    className: "",
    html: `<span class="tm-cluster">${count > 999 ? "999+" : count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const meIcon = () =>
  L.divIcon({
    className: "",
    html: '<div class="tm-me"><span class="tm-me__halo"></span><span class="tm-me__dot"></span></div>',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

/** Leaflet makes keyboard markers focusable buttons; give them a name. */
function useAriaLabel(ref: RefObject<L.Marker>, label: string) {
  useEffect(() => {
    ref.current?.getElement()?.setAttribute("aria-label", label);
  }, [ref, label]);
}

function ViewportWatcher({ onChange, onInteract }: { onChange: (v: Viewport) => void; onInteract?: () => void }) {
  const map = useMapEvents({
    moveend: () => emit(),
    dragstart: () => onInteract?.(),
  });
  const emit = () => {
    const b = map.getBounds();
    onChange({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth(), zoom: map.getZoom() });
  };
  useEffect(() => {
    emit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function CommandRunner({ command, padding }: { command: MapCommand | null; padding: FitPadding }) {
  const map = useMap();
  useEffect(() => {
    if (!command) return;
    if (command.kind === "center") {
      if (command.animate === false) map.setView([command.lat, command.lng], command.zoom, { animate: false });
      else map.flyTo([command.lat, command.lng], command.zoom, { duration: 0.6 });
    } else if (command.points.length) {
      map.flyToBounds(L.latLngBounds(command.points.map((p): LatLngTuple => [p.lat, p.lng])), {
        paddingTopLeft: padding.topLeft,
        paddingBottomRight: padding.bottomRight,
        maxZoom: command.maxZoom ?? 14,
        duration: 0.6,
      });
    }
    // Run once per command object; padding is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, command]);
  return null;
}

const ListingMarker = memo(function ListingMarker({
  item,
  glyph,
  selected,
  onSelect,
}: {
  item: MapListing;
  glyph: GlyphKind;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<L.Marker>(null);
  useAriaLabel(ref, item.label);
  const handlers = useMemo(() => ({ click: () => onSelect(item.id) }), [onSelect, item.id]);
  return (
    <Marker
      ref={ref}
      position={[item.lat, item.lng]}
      icon={listingIcon(glyph, item.badge, selected)}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={handlers}
    >
      <Tooltip direction="top">{item.label}</Tooltip>
    </Marker>
  );
});

// Tap a cluster → zoom +2 around it; pins stacked on one spot (zoomed in
// already) can't spread out, so those open as a list instead.
const ClusterMarker = memo(function ClusterMarker({
  cluster,
  label,
  onOpen,
}: {
  cluster: PinCluster;
  label: string;
  onOpen: (ids: string[]) => void;
}) {
  const map = useMap();
  const ref = useRef<L.Marker>(null);
  useAriaLabel(ref, label);
  const icon = useMemo(() => clusterIcon(cluster.count), [cluster.count]);
  const handlers = useMemo(
    () => ({
      click: () =>
        map.getZoom() >= CLUSTER_MAX_ZOOM
          ? onOpen(cluster.ids)
          : map.setView([cluster.lat, cluster.lng], Math.min(map.getZoom() + 2, 18)),
    }),
    [map, cluster, onOpen],
  );
  return <Marker ref={ref} position={[cluster.lat, cluster.lng]} icon={icon} eventHandlers={handlers} />;
});

function MeMarker({ me }: { me: MeLocation }) {
  const icon = useMemo(meIcon, []);
  return (
    <>
      {me.accuracy != null && me.accuracy < 1000 && (
        <Circle
          center={[me.lat, me.lng]}
          radius={me.accuracy}
          interactive={false}
          pathOptions={{ stroke: false, fillColor: "#0D9488", fillOpacity: 0.08 }}
        />
      )}
      <Marker position={[me.lat, me.lng]} icon={icon} interactive={false} keyboard={false} zIndexOffset={-500} />
    </>
  );
}

export function ListingsMapInner({
  items,
  clusters,
  onClusterOpen,
  glyph,
  selectedId,
  onSelect,
  onViewport,
  onInteract,
  me,
  command,
  fitPadding = DEFAULT_FIT_PADDING,
  clusterLabel,
  className,
}: {
  items: MapListing[];
  clusters: PinCluster[];
  /** Keep stable — a stacked cluster that can't zoom apart. */
  onClusterOpen: (ids: string[]) => void;
  glyph: GlyphKind;
  selectedId: string | null;
  /** Keep stable (useCallback) — markers are memoized on it. */
  onSelect: (id: string) => void;
  onViewport: (v: Viewport) => void;
  onInteract?: () => void;
  me: MeLocation | null;
  command: MapCommand | null;
  fitPadding?: FitPadding;
  clusterLabel: (count: number) => string;
  className?: string;
}) {
  return (
    <div className={className ?? "isolate h-full w-full"}>
      <MapContainer center={KG_CENTER} zoom={7} zoomControl={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
        <ViewportWatcher onChange={onViewport} onInteract={onInteract} />
        <CommandRunner command={command} padding={fitPadding} />
        {clusters.map((c) => (
          <ClusterMarker key={c.ids.join(",")} cluster={c} label={clusterLabel(c.count)} onOpen={onClusterOpen} />
        ))}
        {items.map((it) => (
          <ListingMarker key={it.id} item={it} glyph={glyph} selected={it.id === selectedId} onSelect={onSelect} />
        ))}
        {me && <MeMarker me={me} />}
      </MapContainer>
    </div>
  );
}
