"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCurrentFix,
  queryGeoPermission,
  readLastFix,
  saveLastFix,
  type GeoFix,
  type GeoPermission,
} from "@/lib/hooks/use-geolocation";

/**
 * Map geolocation flow: reads the permission without prompting; when already
 * granted shows the last fix of this session at once and refines it. The OS
 * prompt fires only from `request()` (a user tap on «Разрешить»).
 */
export function useMapLocation() {
  const [perm, setPerm] = useState<GeoPermission | "checking">("checking");
  const [me, setMe] = useState<GeoFix | null>(null);
  const [locating, setLocating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  // Bumped after every user-requested fix → the screen recenters on it.
  const [requestSeq, setRequestSeq] = useState(0);
  const busy = useRef(false);

  const locate = useCallback(async (userRequested: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setLocating(true);
    const res = await getCurrentFix();
    busy.current = false;
    setLocating(false);
    if (res.ok) {
      saveLastFix(res.fix);
      setMe(res.fix);
      setPerm("granted");
      setFailed(false);
      setCardOpen(false);
      if (userRequested) setRequestSeq((n) => n + 1);
    } else if (res.reason === "denied") {
      setPerm("denied");
      setCardOpen(true);
    } else {
      setFailed(true);
      if (userRequested) setCardOpen(true);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let status: PermissionStatus | null = null;
    const onChange = () => {
      if (!status || !alive) return;
      setPerm(status.state);
      // The user flipped the site setting to «Allow» — no prompt involved.
      if (status.state === "granted") void locate(false);
    };
    void (async () => {
      const p = await queryGeoPermission();
      if (!alive) return;
      setPerm(p);
      if (p === "granted") {
        const cached = readLastFix();
        if (cached) setMe(cached);
        void locate(false);
      } else {
        setCardOpen(true);
      }
      try {
        status = (await navigator.permissions?.query({ name: "geolocation" })) ?? null;
        status?.addEventListener("change", onChange);
      } catch {
        /* Permissions API missing (older Safari) */
      }
    })();
    return () => {
      alive = false;
      status?.removeEventListener("change", onChange);
    };
  }, [locate]);

  return {
    perm,
    me,
    locating,
    failed,
    cardOpen,
    requestSeq,
    request: useCallback(() => void locate(true), [locate]),
    openCard: useCallback(() => setCardOpen(true), []),
    dismissCard: useCallback(() => setCardOpen(false), []),
    refresh: useCallback(() => void locate(false), [locate]),
  };
}
