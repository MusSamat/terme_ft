"use client";

import { useCallback, useState } from "react";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** One-shot browser geolocation; resolves null when denied / unavailable. */
export function getCurrentPoint(timeoutMs = 8000): Promise<GeoPoint | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export function useGeolocation() {
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const locate = useCallback(async () => {
    setLocating(true);
    const p = await getCurrentPoint();
    setLocating(false);
    setDenied(p === null);
    return p;
  }, []);
  return { locate, locating, denied };
}
