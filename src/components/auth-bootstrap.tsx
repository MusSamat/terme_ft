"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasSessionHint,
  refreshAccessToken,
  onTokenRefreshed,
  setTokens,
} from "@/lib/api/client";
import { getMe, loginWithTelegramMiniApp } from "@/lib/api/auth";
import { useAuth } from "@/store/auth";
import { refreshSocketAuth } from "@/lib/socket/client";
import { detectRuntime, getTelegramInitData } from "@/lib/detect-runtime";
import { isFullAuthResult } from "@/lib/api/types";

// Inside Telegram Mini App the shell must not flash guest UI and then flip to
// logged-in: a boot splash (#tma-splash) covers the app from the very first
// paint — added synchronously as .tma-boot on <html> by the inline script in
// layout.tsx, before React hydrates. This component only *removes* it once the
// auth bootstrap below resolves (authenticated | anonymous). Regular web has no
// splash. Network failure degrades to guest after this timeout instead of hanging.
const TMA_SPLASH_TIMEOUT_MS = 6000;

// Fade the CSS boot splash out, then drop the class entirely (matches the
// 0.2s opacity transition in globals.css).
function hideBootSplash(): void {
  const el = document.documentElement;
  if (!el.classList.contains("tma-boot")) return;
  el.classList.add("tma-boot-hide");
  window.setTimeout(() => el.classList.remove("tma-boot", "tma-boot-hide"), 220);
}

// On-device diagnostic overlay — only inside Telegram AND with the debug flag
// on (NEXT_PUBLIC_TMA_DEBUG=1, or a #tmadebug URL hash for no-rebuild toggling).
function isTmaDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_TMA_DEBUG === "1") return true;
  if (typeof window !== "undefined" && window.location.hash.includes("tmadebug")) return true;
  return false;
}

function describeAxiosError(e: unknown): string {
  const err = e as {
    message?: string;
    response?: { status?: number; data?: { error?: { code?: string } } };
  };
  const status = err.response?.status ?? "none";
  const code = err.response?.data?.error?.code ?? "none";
  return `login FAILED http=${status} code=${code} msg=${err.message ?? "error"}`;
}

export function AuthBootstrap() {
  const { hydrate, setStatus, clearSession } = useAuth();
  const status = useAuth((s) => s.status);
  const done = useRef(false);

  const [debugOn, setDebugOn] = useState(false);
  const [dbg, setDbg] = useState<string[]>([]);
  const [dbgDismissed, setDbgDismissed] = useState(false);
  const pushDbg = useCallback((line: string) => {
    setDbg((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${line}`]);
  }, []);

  useEffect(() => {
    setDebugOn(detectRuntime() === "telegram" && isTmaDebugEnabled());
  }, []);

  // Record every auth status transition so the user can screenshot the sequence.
  useEffect(() => {
    if (!debugOn) return;
    pushDbg(`status → ${status}`);
  }, [status, debugOn, pushDbg]);

  // Remove the CSS boot splash once auth resolves (or after a timeout so a hung
  // network never traps the user behind it). The splash itself was put up before
  // paint by the layout inline script — this effect only tears it down.
  useEffect(() => {
    if (!document.documentElement.classList.contains("tma-boot")) return;
    if (status === "authenticated" || status === "anonymous") {
      hideBootSplash();
      return;
    }
    const timer = window.setTimeout(hideBootSplash, TMA_SPLASH_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    onTokenRefreshed(refreshSocketAuth);

    if (done.current) return;
    done.current = true;

    const wa = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
    pushDbg(`runtime=${detectRuntime()} WebApp=${Boolean(wa)}`);
    if (wa) pushDbg(`tg version=${wa.version} platform=${wa.platform}`);

    const sessionLikely = hasSessionHint();

    // Telegram Mini App silent login via initData. Returns false when not
    // running inside Telegram (or initData is unavailable). Mirrors the web
    // session-hint path: after login it fetches the full profile via getMe
    // and only then flips to "authenticated" (hydrate) — so the app opens
    // with complete user data, never partial. The splash stays up until then.
    const tryTelegramSilentLogin = (): boolean => {
      if (detectRuntime() !== "telegram") return false;
      const initData = getTelegramInitData();
      pushDbg(`initData length=${initData?.length ?? 0}`);
      if (!initData) return false;
      setStatus("loading");
      loginWithTelegramMiniApp(initData)
        .then((result) => {
          if (isFullAuthResult(result)) {
            pushDbg("login OK kind=full");
            // Keep status "loading" (splash up) while we load the full profile.
            setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
            refreshSocketAuth();
            return getMe().then((user) => {
              pushDbg("getMe OK → authenticated");
              hydrate(user); // sets status=authenticated
            });
          }
          // Provisional — Telegram account exists but has no phone yet.
          // Leave status as anonymous; the app will redirect to /auth/login.
          pushDbg("login OK kind=provisional → anonymous");
          setStatus("anonymous");
          return undefined;
        })
        .catch((e) => {
          pushDbg(describeAxiosError(e));
          setStatus("anonymous");
        });
      return true;
    };

    // Telegram Mini App silent login: inside Telegram we auto-authenticate from
    // initData and auto-register the account (backend /auth/telegram creates the
    // user with a +prov: placeholder phone and returns a full session). Outside
    // Telegram this is a no-op and users fall back to phone + password.
    const ALLOW_TELEGRAM_SILENT_LOGIN = true;

    if (!sessionLikely) {
      // No prior session — attempt Telegram Mini App silent login if enabled.
      if (!(ALLOW_TELEGRAM_SILENT_LOGIN && tryTelegramSilentLogin())) setStatus("anonymous");
      return;
    }

    setStatus("loading");
    // Refresh first: accessToken lives only in memory and is wiped on every page load.
    refreshAccessToken()
      .then(() => getMe())
      .then((user) => {
        hydrate(user);
        refreshSocketAuth();
      })
      .catch((e) => {
        pushDbg(`session refresh failed: ${describeAxiosError(e)}`);
        clearSession();
        // Telegram webviews may block the cross-site refresh cookie entirely —
        // fall back to the silent Mini App login instead of staying logged out.
        tryTelegramSilentLogin();
      });
  }, [hydrate, setStatus, clearSession, pushDbg]);

  return (
    <>
      {debugOn && !dbgDismissed && (
        <div
          className="fixed inset-x-0 top-0 z-[110] max-h-[45vh] overflow-auto bg-black/90 px-3 py-2 font-mono text-[11px] leading-tight text-green-300"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="mb-1 flex items-center justify-between text-white">
            <span>TMA DEBUG</span>
            <button
              type="button"
              onClick={() => setDbgDismissed(true)}
              className="rounded bg-white/20 px-2 py-0.5 text-white"
            >
              ✕
            </button>
          </div>
          {dbg.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </>
  );
}
