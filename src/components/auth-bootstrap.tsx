"use client";

import { useEffect, useRef } from "react";
import { hasSessionHint, refreshAccessToken, onTokenRefreshed } from "@/lib/api/client";
import { getMe } from "@/lib/api/auth";
import { useAuth } from "@/store/auth";
import { refreshSocketAuth } from "@/lib/socket/client";

// Restores the session on page load: the access token lives only in memory,
// the refresh token in an HttpOnly cookie → refresh, then load the profile.
export function AuthBootstrap() {
  const { hydrate, setStatus, clearSession } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    onTokenRefreshed(refreshSocketAuth);
    if (done.current) return;
    done.current = true;

    if (!hasSessionHint()) {
      setStatus("anonymous");
      return;
    }
    setStatus("loading");
    refreshAccessToken()
      .then(() => getMe())
      .then((user) => {
        hydrate(user);
        refreshSocketAuth();
      })
      .catch(() => clearSession());
  }, [hydrate, setStatus, clearSession]);

  return null;
}
