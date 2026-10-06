"use client";

import { useLocale } from "next-intl";
import { locales, type Locale } from "@/i18n.config";
import { Segmented } from "@/components/ui/segmented";
import { switchLocale } from "@/components/ui/locale-switcher";
import { useAuth } from "@/store/auth";

// Quick settings — language only ([RU|KG]). The theme toggle was removed: the
// app is light-only now (parity with the Flutter app). Language changes sync to
// the backend (Telegram notifications localize from user.language).

export function SettingsCard() {
  const isAuthenticated = useAuth((s) => s.status === "authenticated");
  const current = useLocale() as Locale;

  return (
    <div className="flex gap-2 rounded-4xl bg-white p-2.5 shadow-card dark:bg-ink-900">
      <Segmented<Locale>
        className="flex-1"
        value={current}
        onChange={(l) => void switchLocale(l, isAuthenticated)}
        options={locales.map((l) => ({ value: l, label: l.toUpperCase() }))}
      />
    </div>
  );
}
