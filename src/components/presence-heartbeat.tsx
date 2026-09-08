"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import { pingPresence } from "@/lib/api/presence";

// Fires while the app is open + authenticated. Server throttles writes to ~20s,
// so a 30s beat is safe and keeps "online" (60s window) accurate.
const INTERVAL_MS = 30_000;

/** Invisible presence heartbeat, mounted once in the root layout. */
export function PresenceHeartbeat() {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    if (status !== "authenticated") return;

    const beat = () => {
      if (document.visibilityState === "visible") void pingPresence().catch(() => {});
    };
    beat(); // immediate on login / mount
    const timer = setInterval(beat, INTERVAL_MS);
    // Coming back to the tab → refresh presence right away.
    const onVis = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [status]);

  return null;
}
