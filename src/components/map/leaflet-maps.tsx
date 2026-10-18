"use client";

// Client-only Leaflet maps (imported through ./index with ssr:false). OSM tiles,
// HTML div icons — no image assets, crisp on every DPR.
import { useEffect, useMemo, useRef } from "react";
import L, { type LatLngTuple } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
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

function bubble(count: number, color: string) {
  const size = count < 10 ? 34 : count < 100 ? 40 : 46;
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};color:#fff;font:800 13px/1 Manrope,system-ui,sans-serif;border:3px solid rgba(255,255,255,.9);box-shadow:0 4px 12px rgba(0,0,0,.25)">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
  useEffect(() => {
    if (points.length === 1) map.setView(points[0]!, 13);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [36, 36] });
  }, [map, points]);
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
          <Marker key={i} position={[s.lat, s.lng]} icon={dot("#64748B", 12)}>
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

// ─── Listings map (/map, airport) ──────────────────────────────────────
export interface MapListing {
  id: string;
  lat: number;
  lng: number;
  exact: boolean;
  label: string;
}

export interface MapCluster {
  lat: number;
  lng: number;
  count: number;
}

export interface Viewport {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
}

function ViewportWatcher({ onChange }: { onChange: (v: Viewport) => void }) {
  const map = useMapEvents({
    moveend: () => emit(),
    zoomend: () => emit(),
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

function Recenter({ to }: { to: MapPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.flyTo([to.lat, to.lng], 13, { duration: 0.6 });
  }, [map, to]);
  return null;
}

export function ListingsMapInner({
  items,
  clusters,
  onViewport,
  onSelect,
  me,
  recenter,
  color,
  className,
}: {
  items: MapListing[];
  clusters: MapCluster[];
  onViewport: (v: Viewport) => void;
  onSelect: (id: string) => void;
  me: MapPoint | null;
  recenter: MapPoint | null;
  color: string;
  className?: string;
}) {
  const exactIcon = useMemo(() => pin(color), [color]);
  const cityIcon = useMemo(() => dot(color, 18), [color]);
  const meIcon = useMemo(() => dot("#2563EB", 16), []);
  return (
    <div className={className ?? "isolate h-full w-full"}>
      <MapContainer center={KG_CENTER} zoom={7} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
        <ViewportWatcher onChange={onViewport} />
        <Recenter to={recenter} />
        {clusters.map((c, i) => (
          <ClusterMarker key={`c${i}-${c.lat}-${c.lng}`} cluster={c} color={color} />
        ))}
        {items.map((it) => (
          <Marker
            key={it.id}
            position={[it.lat, it.lng]}
            icon={it.exact ? exactIcon : cityIcon}
            eventHandlers={{ click: () => onSelect(it.id) }}
          >
            <Tooltip direction="top" offset={[0, it.exact ? -40 : -10]}>{it.label}</Tooltip>
          </Marker>
        ))}
        {me && <Marker position={[me.lat, me.lng]} icon={meIcon} />}
      </MapContainer>
    </div>
  );
}

// Tap a cluster → zoom in on it.
function ClusterMarker({ cluster, color }: { cluster: MapCluster; color: string }) {
  const map = useMap();
  const icon = useMemo(() => bubble(cluster.count, color), [cluster.count, color]);
  return (
    <Marker
      position={[cluster.lat, cluster.lng]}
      icon={icon}
      eventHandlers={{ click: () => map.flyTo([cluster.lat, cluster.lng], Math.min(map.getZoom() + 2, 16)) }}
    />
  );
}
