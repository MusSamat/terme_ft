"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
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
      .catch((e: unknown) => {
        // Only a server rejection ends the session. Offline / 5xx / timeout keep
        // the session hint so the next load retries the (still valid) cookie.
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;
        if (status === 401 || status === 403) clearSession();
        else setStatus("anonymous");
      });
  }, [hydrate, setStatus, clearSession]);

  return null;
}
