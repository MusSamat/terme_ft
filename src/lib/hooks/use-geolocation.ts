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

export type GeoPermission = "granted" | "prompt" | "denied" | "unknown";

/** Permission state without triggering the OS prompt ("unknown" when the API is missing). */
export async function queryGeoPermission(): Promise<GeoPermission> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
    const s = await navigator.permissions.query({ name: "geolocation" });
    return s.state;
  } catch {
    return "unknown";
  }
}

export interface GeoFix extends GeoPoint {
  /** Metres (68% confidence), as reported by the browser. */
  accuracy: number;
}

export type GeoFixResult = { ok: true; fix: GeoFix } | { ok: false; reason: "denied" | "unavailable" };

/** One-shot position with accuracy; tells "denied" apart from timeout / no signal. */
export function getCurrentFix(timeoutMs = 8000): Promise<GeoFixResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: "unavailable" });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          fix: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
        }),
      (err) => resolve({ ok: false, reason: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

// Last fix of this tab session — shown instantly on the next map open while the
// fresh one is acquired. Lives only in sessionStorage; never sent anywhere.
const LAST_FIX_KEY = "terme_last_fix";

export function readLastFix(): GeoFix | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(LAST_FIX_KEY) ?? "null") as Partial<GeoFix> | null;
    return v && Number.isFinite(v.lat) && Number.isFinite(v.lng)
      ? { lat: v.lat!, lng: v.lng!, accuracy: Number.isFinite(v.accuracy) ? v.accuracy! : 5000 }
      : null;
  } catch {
    return null;
  }
}

export function saveLastFix(fix: GeoFix): void {
  try {
    sessionStorage.setItem(LAST_FIX_KEY, JSON.stringify(fix));
  } catch {
    /* private mode */
  }
}
