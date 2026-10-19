"use client";

import { useTranslations } from "next-intl";
import { LocateFixed, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Pre-permission card shown before the OS prompt (and the «denied» how-to). */
export function LocationCard({
  denied,
  failed,
  locating,
  onAllow,
  onLater,
}: {
  denied: boolean;
  failed: boolean;
  locating: boolean;
  onAllow: () => void;
  onLater: () => void;
}) {
  const t = useTranslations("map");
  const Icon = denied ? MapPinOff : LocateFixed;
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="map-perm-title"
      aria-describedby="map-perm-body"
      className="pointer-events-auto mx-auto w-full max-w-[480px] rounded-3xl bg-white p-5 shadow-lift dark:bg-ink-900"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="map-perm-title" className="text-[17px] font-900 leading-snug text-ink-900 dark:text-white">
            {denied ? t("perm_denied_title") : t("perm_title")}
          </h2>
          <p id="map-perm-body" className="mt-1 text-[13.5px] font-600 leading-relaxed text-ink-600 dark:text-ink-300">
            {denied ? t("perm_denied_body") : t("perm_body")}
          </p>
          {failed && !denied && (
            <p role="alert" className="mt-2 text-[12.5px] font-700 text-danger-600">
              {t("perm_failed")}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="ghost" size="lg" onClick={onLater}>
          {t("perm_later")}
        </Button>
        <Button variant="cta" size="lg" onClick={onAllow} disabled={locating} aria-busy={locating}>
          {locating ? t("locating") : denied ? t("perm_retry") : t("perm_allow")}
        </Button>
      </div>
    </section>
  );
}

/** Slim reminder while the map runs without the user's position. */
export function GeoBanner({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-ink-900/90 px-3 py-2 text-white shadow-card backdrop-blur dark:bg-white/90 dark:text-ink-900">
      <MapPinOff className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[12.5px] font-700 leading-snug">{text}</p>
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-xl bg-white/15 px-3 py-1.5 text-[12.5px] font-900 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:bg-ink-900/10 dark:hover:bg-ink-900/20"
        >
          {action}
        </button>
      )}
    </div>
  );
}
