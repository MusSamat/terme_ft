"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CarFront, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/store/auth";

// Dismissible «Стать водителем» promo for the trips feed. Shown only to
// authenticated users who are NOT yet drivers. Closing it hides the banner for
// 7 days (we store the dismiss timestamp, not a permanent flag) so we nudge
// without nagging — the permanent entry stays on the profile page.
const KEY = "terme_become_driver_dismissed_at";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function BecomeDriverBanner() {
  const authed = useAuth((s) => s.status === "authenticated");
  const isDriver = useAuth((s) => s.user?.roles?.includes("driver") ?? false);
  const t = useTranslations("profile");

  // Start hidden and reveal after the localStorage check so the banner never
  // flashes for users who already dismissed it (and to avoid hydration mismatch).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!authed || isDriver) {
      setVisible(false);
      return;
    }
    const raw = localStorage.getItem(KEY);
    const dismissedAt = raw ? Number(raw) : 0;
    setVisible(!dismissedAt || Date.now() - dismissedAt > SEVEN_DAYS);
  }, [authed, isDriver]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="relative mb-5 flex items-center gap-3 rounded-3xl bg-grape-600 px-4 py-3.5 text-white shadow-indigocta">
      <Link href="/profile/driver" className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <CarFront className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-900">{t("become_driver_title")}</span>
          <span className="block truncate text-[14px] font-600 text-white/80">{t("become_driver_sub")}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-white/80" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("become_driver_hide")}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
