"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` — load the maps client-side only.
function MapSkeleton() {
  return <div className="h-full min-h-[14rem] w-full animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />;
}

export const RouteMap = dynamic(() => import("./leaflet-maps").then((m) => m.RouteMapInner), {
  ssr: false,
  loading: MapSkeleton,
});
export const PointPickerMap = dynamic(() => import("./leaflet-maps").then((m) => m.PointPickerInner), {
  ssr: false,
  loading: MapSkeleton,
});
export const ListingsMap = dynamic(() => import("./leaflet-maps").then((m) => m.ListingsMapInner), {
  ssr: false,
  loading: MapSkeleton,
});

export type { MapPoint, MapListing, Viewport, MeLocation, MapCommand, FitPadding } from "./leaflet-maps";
