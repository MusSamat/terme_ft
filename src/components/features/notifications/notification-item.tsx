"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markNotificationRead, type AppNotification } from "@/lib/api/notifications";
import type { Locale } from "@/i18n.config";
import { formatShortDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { TYPE_CONFIG, ACTION_TYPES, buildBody, buildDeepLink, typeLabel } from "./_utils/notification-utils";
import { NotificationActions } from "./_components/notification-actions";

type NotifTranslator = (key: string, values?: Record<string, string | number>) => string;

function formatNotifTime(iso: string, t: NotifTranslator, locale: Locale): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t("time_now");
  if (diffMin < 60) return t("time_minutes", { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("time_hours", { n: diffH });
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return t("time_days", { n: diffD });
  return formatShortDate(iso, locale);
}

// Icon-medallion tone derived from the type's color (§2.8). Literal maps so the
// Tailwind scanner keeps every variant.
type Tone = "brand" | "accent" | "ink";

function toneOf(color: string): Tone {
  if (color.includes("brand")) return "brand";
  if (color.includes("accent")) return "accent";
  return "ink";
}

const CARD_UNREAD: Record<Tone, string> = {
  brand: "bg-brand-50 ring-brand-100 dark:bg-brand-500/10 dark:ring-brand-500/20",
  accent: "bg-accent-50 ring-accent-100 dark:bg-accent-500/10 dark:ring-accent-500/20",
  ink: "bg-ink-100 ring-ink-100 dark:bg-ink-800/60 dark:ring-ink-800",
};

const MEDALLION_UNREAD: Record<Tone, string> = {
  brand: "bg-brand-600 text-white",
  accent: "bg-accent-500 text-white",
  ink: "bg-ink-600 text-white",
};

const MEDALLION_READ: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  accent: "bg-accent-100 text-accent-600 dark:bg-accent-500/15",
  ink: "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300",
};

interface Props {
  notification: AppNotification;
}

export function NotificationItem({ notification }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("notif");
  const locale = useLocale() as Locale;
  // Server prop is the source of truth (so «прочитать все» recolors every
  // item on refetch); local flag only covers the optimistic single-click.
  const [optimisticRead, setRead] = useState(false);
  const read = optimisticRead || !!notification.readAt;
  const config = TYPE_CONFIG[notification.type] ?? { icon: Bell, color: "text-ink-700" };
  const label = typeLabel(notification.type, t);
  const Icon = config.icon;
  const tone = toneOf(config.color);
  const hasActions = ACTION_TYPES.has(notification.type);
  const deepLink = buildDeepLink(notification);

  const { mutate: markRead } = useMutation({
    mutationFn: () => markNotificationRead(notification.id),
    onMutate: () => setRead(true),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  function handleHeaderClick() {
    if (!read) markRead();
    if (deepLink) router.push(deepLink);
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl transition-colors",
        read
          ? "bg-white shadow-sm ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800"
          : cn("ring-1", CARD_UNREAD[tone]),
      )}
    >
      <button
        type="button"
        onClick={handleHeaderClick}
        className={cn(
          "flex w-full items-start gap-3 p-3.5 text-left",
          deepLink && "cursor-pointer",
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            read ? MEDALLION_READ[tone] : MEDALLION_UNREAD[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-[14px] text-ink-900 dark:text-white", read ? "font-800" : "font-900")}>
              {label}
            </p>
            <span className="shrink-0 text-[14px] font-medium text-ink-400">
              {formatNotifTime(notification.createdAt, t, locale)}
            </span>
          </div>
          <p className="mt-0.5 text-[14px] font-600 text-ink-500 dark:text-ink-400">{buildBody(notification, t, locale)}</p>
        </div>
        {!read && (
          <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
        )}
      </button>

      {hasActions && (
        <div className="border-t border-ink-100 px-3.5 pb-3 pt-2.5 dark:border-ink-800">
          <NotificationActions notification={notification} />
        </div>
      )}
    </article>
  );
}
