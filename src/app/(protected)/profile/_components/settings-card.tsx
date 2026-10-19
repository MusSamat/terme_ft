"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Send } from "lucide-react";
import { locales, type Locale } from "@/i18n.config";
import { Segmented } from "@/components/ui/segmented";
import { switchLocale } from "@/components/ui/locale-switcher";
import { IntentToggle } from "@/components/features/search/intent-toggle";
import { useAuth } from "@/store/auth";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "terme_kg_bot";

// Quick settings: mode (what home leads with, synced to users.preferredMode),
// language (synced to the backend for notifications) and the optional Telegram
// bot hookup — the bot links itself once the user shares the same number.
export function SettingsCard() {
  const t = useTranslations("profile");
  const isAuthenticated = useAuth((s) => s.status === "authenticated");
  const mode = useAuth((s) => s.activeMode);
  const setMode = useAuth((s) => s.setActiveMode);
  const botLinked = useAuth((s) => !!s.user?.telegramLinked);
  const current = useLocale() as Locale;

  return (
    <div className="space-y-2.5 rounded-4xl bg-white p-2.5 shadow-card dark:bg-ink-900">
      <IntentToggle value={mode} onChange={setMode} />
      <Segmented<Locale>
        value={current}
        onChange={(l) => void switchLocale(l, isAuthenticated)}
        options={locales.map((l) => ({ value: l, label: l.toUpperCase() }))}
      />
      {isAuthenticated && !botLinked && (
        <a
          href={`https://t.me/${BOT_USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl px-2 py-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#229ED9]/15 text-[#229ED9]">
            <Send className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-700 text-ink-800 dark:text-ink-100">{t("bot_connect")}</span>
            <span className="block text-[13px] font-600 text-ink-400">{t("bot_connect_sub")}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-ink-300" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
