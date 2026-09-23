"use client";

import { useState, useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCheck, CheckCircle, Inbox, MessageCircle } from "lucide-react";
import { getNotifications, markAllNotificationsRead } from "@/lib/api/notifications";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { toastError } from "@/components/layout/quick-toast";
import { NotificationItem } from "@/components/features/notifications/notification-item";
import { useAuth } from "@/store/auth";
import { PullToRefresh, QueryError, SectionLabel, Spinner, Switch } from "@/components/ui";
import { useInfiniteScroll } from "@/lib/hooks/use-infinite-scroll";
import { cn } from "@/lib/utils/cn";

const LIMIT = 20;
const ADMIN_TYPES = new Set(["verification_sla_breach"]);

const NOTIF_TYPE_GROUPS: Record<string, string[]> = {
  messages:      ["chat_message", "chat_unread"],
  bookings:      ["booking_accepted", "booking_rejected", "booking_cancelled", "booking_cancelled_driver", "booking_cancelled_passenger", "booking_pending", "booking_viewed", "booking_no_show", "booking_completed"],
  reminders:     ["trip_reminder_2h", "trip_reminder_1h", "trip_reminder_1d"],
  ratings:       ["rating_request"],
  marketing:     ["promo", "news", "marketing"],
};

interface NotifSetting {
  key: string;
  label: string;
  defaultOn: boolean;
}

const NOTIF_SETTING_KEYS: { key: string; defaultOn: boolean }[] = [
  { key: "messages",  defaultOn: true  },
  { key: "bookings",  defaultOn: true  },
  { key: "reminders", defaultOn: true  },
  { key: "ratings",   defaultOn: true  },
  { key: "marketing", defaultOn: false },
];

type Filter = "all" | "bookings" | "messages";

function loadPrefs(userId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`terme_notif_prefs_${userId}`);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function savePrefs(userId: string, prefs: Record<string, boolean>): void {
  try {
    localStorage.setItem(`terme_notif_prefs_${userId}`, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable — silent fail
  }
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const fe = useFriendlyError();
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

  const NOTIF_SETTINGS: NotifSetting[] = NOTIF_SETTING_KEYS.map((s) => ({
    ...s,
    label: t(`types.${s.key as "messages" | "bookings" | "reminders" | "ratings" | "marketing"}`),
  }));

  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!userId) return;
    const saved = loadPrefs(userId);
    const defaults = Object.fromEntries(
      NOTIF_SETTING_KEYS.map((s) => [s.key, saved[s.key] ?? s.defaultOn]),
    );
    setPrefs(defaults);
    setPrefsLoaded(true);
  }, [userId]);

  const togglePref = (key: string) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (userId) savePrefs(userId, next);
      return next;
    });
  };

  const query = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) =>
      getNotifications({ cursor: pageParam as string | undefined, limit: LIMIT }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const sentinel = useInfiniteScroll({
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  });

  const disabledTypes = prefsLoaded
    ? new Set(
        NOTIF_SETTINGS
          .filter((s) => !prefs[s.key])
          .flatMap((s) => NOTIF_TYPE_GROUPS[s.key] ?? []),
      )
    : new Set<string>();

  const allNotifications = (query.data?.pages.flatMap((p) => p.data) ?? [])
    .filter((n) => !ADMIN_TYPES.has(n.type) && !disabledTypes.has(n.type));

  const notifications = allNotifications.filter((n) => {
    if (filter === "bookings") return n.type.includes("booking");
    if (filter === "messages") return n.type.includes("message");
    return true;
  });

  const unreadCount = allNotifications.filter((n) => !n.readAt).length;
  const today = notifications.filter((n) => isToday(n.createdAt));
  const earlier = notifications.filter((n) => !isToday(n.createdAt));

  const { mutate: markAllRead, isPending: markingAll } = useMutation({
    // Single bulk endpoint — covers unread rows on pages not yet loaded,
    // which the old per-row fan-out silently missed.
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e) => toastError(fe(extractError(e))),
  });

  const markAllBtn = unreadCount > 0 && (
    <button
      type="button"
      onClick={() => markAllRead()}
      disabled={markingAll}
      className="flex items-center gap-1.5 text-[13px] font-800 text-brand-600 hover:text-brand-700 disabled:opacity-50 dark:text-brand-300"
    >
      <CheckCheck className="h-4 w-4" aria-hidden="true" />
      {t("mark_all_read_btn")}
    </button>
  );

  const renderSection = (label: string, items: typeof notifications) =>
    items.length > 0 && (
      <div className="space-y-2.5">
        <SectionLabel>{label}</SectionLabel>
        {items.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
    );

  const list = (
    <div className="flex flex-col gap-4">
      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size={24} />
        </div>
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={() => void query.refetch()} />
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-card dark:bg-ink-900">
          <p className="text-[18px] font-900 text-ink-900 dark:text-white">{t("empty_title")}</p>
          <p className="mt-2 text-[15px] font-700 text-ink-500">{t("empty_hint")}</p>
        </div>
      ) : (
        <>
          {renderSection(t("section_today"), today)}
          {renderSection(t("section_earlier"), earlier)}
        </>
      )}
      {query.isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner size={20} />
        </div>
      )}
      <div ref={sentinel} aria-hidden="true" />
    </div>
  );

  const FILTERS: { key: Filter; label: string; icon: typeof Inbox }[] = [
    { key: "all", label: t("filter_all"), icon: Inbox },
    { key: "bookings", label: t("filter_bookings"), icon: CheckCircle },
    { key: "messages", label: t("filter_messages"), icon: MessageCircle },
  ];

  const settingsCard = (
    <div className="rounded-3xl bg-white p-5 shadow-card dark:bg-ink-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-900 text-ink-900 dark:text-white">{t("settings_title")}</h2>
        {prefsLoaded && <span className="text-[13px] font-700 text-ink-400">{t("settings_saved")}</span>}
      </div>
      <div className="flex flex-col gap-3.5">
        {NOTIF_SETTINGS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-[15px] font-800 text-ink-900 dark:text-ink-100">{label}</span>
            <Switch checked={prefs[key] ?? true} onCheckedChange={() => togglePref(key)} aria-label={label} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <PullToRefresh onRefresh={() => query.refetch()}>
      <div className="min-h-[calc(100vh-64px)] bg-ink-50 dark:bg-ink-950">
      {/* Mobile */}
      <div className="mx-auto w-full max-w-[760px] p-3.5 pt-11 md:p-6 lg:hidden">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[20px] font-900 text-ink-900 dark:text-white">{t("title")}</h1>
          {markAllBtn}
        </div>
        {list}
        <div className="mt-6">{settingsCard}</div>
      </div>

      {/* Desktop — aside filter list + list (§2.8) */}
      <div className="mx-auto hidden w-full max-w-[1080px] gap-8 p-8 lg:grid lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <div>
            <h1 className="text-[26px] font-900 text-ink-900 dark:text-white">{t("title")}</h1>
            <p className="mt-1 text-[15px] font-700 text-ink-500">{t("aside_sub")}</p>
          </div>
          <div className="space-y-1 rounded-3xl bg-white p-2 shadow-soft dark:bg-ink-900">
            {FILTERS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-2xl px-4 py-2.5 text-[14px] font-800 transition-colors",
                  filter === key
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                    : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="flex-1 text-left">{label}</span>
                {key === "all" && unreadCount > 0 && (
                  <span className="rounded-full bg-coral-500 px-1.5 text-[11px] font-900 text-white">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              disabled={markingAll}
              className="w-full rounded-2xl bg-white py-3 text-[14px] font-900 text-brand-600 shadow-soft disabled:opacity-50 dark:bg-ink-900 dark:text-brand-300"
            >
              {t("mark_all_read_btn")}
            </button>
          )}
          {settingsCard}
        </aside>
        <section>{list}</section>
      </div>
      </div>
    </PullToRefresh>
  );
}
