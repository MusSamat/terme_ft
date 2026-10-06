"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Bell, ChevronRight, MessageCircle } from "lucide-react";
import { getChatSummaries } from "@/lib/api/chat";
import { PullToRefresh, Spinner } from "@/components/ui";
import { QueryError } from "@/components/ui/query-error";
import { useUnreadCount } from "@/lib/hooks/use-unread-count";
import { ChatRow } from "./_components/chat-row";

// Chat hub — design-spec §2.6. Mobile = conversation list; desktop = 2-col
// (list + "pick a conversation" placeholder). The thread itself lives at
// /my/bookings/[id]/chat (that route renders its own desktop sidebar).

const ACTIVE_CHAT_STATUSES = new Set(["pending", "viewed", "accepted"]);

export function ChatHub() {
  const t = useTranslations("chat");
  const { data: notifUnread = 0 } = useUnreadCount();
  const { data: summaries = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["chat", "summaries"],
    queryFn: getChatSummaries,
    staleTime: 15_000,
  });

  // Only active conversations are listed (Uber/Yandex style): a chat lives with
  // its trip; once the trip is over it leaves the list instead of an archive.
  const active = summaries.filter((s) => ACTIVE_CHAT_STATUSES.has(s.bookingStatus));

  const list = (
    <div className="flex flex-col">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={24} />
        </div>
      ) : isError ? (
        <QueryError error={error} onRetry={() => void refetch()} className="m-4" />
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-ink-400 dark:bg-ink-800">
            <MessageCircle className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="text-[16px] font-900 text-ink-700 dark:text-ink-200">{t("no_chats")}</p>
          <p className="text-[15px] font-700 text-ink-400">{t("hub_empty_hint")}</p>
        </div>
      ) : (
        <>
          {active.map((s) => (
            <ChatRow key={s.bookingId} s={s} isActive={false} />
          ))}
        </>
      )}
    </div>
  );

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="min-h-[calc(100vh-64px)] bg-ink-50 dark:bg-ink-950">
      {/* Mobile — full-width conversation list */}
      <div className="lg:hidden">
        <header className="bg-white px-4 pb-2 pt-11 dark:bg-ink-900">
          <h1 className="text-[20px] font-900 text-ink-900 dark:text-white">{t("hub_title")}</h1>
          <p className="mt-0.5 text-[14px] font-700 text-ink-500 dark:text-ink-400">
            {active.length > 0 ? t("active_count", { n: active.length }) : t("no_active")}
          </p>
        </header>
        {/* Notifications entry — replaces the draggable floating bell: a fixed,
            thumb-reachable inbox row instead of a FAB covering content. */}
        <Link
          href="/notifications"
          className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Bell className="h-5 w-5" aria-hidden="true" />
            {notifUnread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[9px] font-900 text-white ring-2 ring-white dark:ring-ink-900">
                {notifUnread > 9 ? "9+" : notifUnread}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-800 text-ink-900 dark:text-white">{t("notifications_row")}</span>
            <span className="block text-[14px] font-600 text-ink-500 dark:text-ink-400">
              {notifUnread > 0 ? t("notifications_unread", { n: notifUnread }) : t("notifications_none")}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
        </Link>
        <div className="bg-white pb-24 dark:bg-ink-900">{list}</div>
      </div>

      {/* Desktop — 2-col: list + placeholder */}
      <div className="mx-auto hidden max-w-[1080px] lg:grid lg:grid-cols-[340px_1fr]">
        <aside className="min-h-[560px] border-r border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
          <div className="px-5 pb-3 pt-5">
            <p className="text-[20px] font-900 text-ink-900 dark:text-white">{t("hub_title")}</p>
            <p className="mt-0.5 text-[14px] font-700 text-ink-500 dark:text-ink-400">
              {active.length > 0 ? t("active_count", { n: active.length }) : t("no_active")}
            </p>
          </div>
          <div className="h-px bg-ink-100 dark:bg-ink-800" />
          {list}
        </aside>
        <div className="flex min-h-[560px] flex-col items-center justify-center gap-3 bg-ink-50 px-8 text-center dark:bg-ink-950">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink-400 shadow-soft dark:bg-ink-900">
            <MessageCircle className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="text-[17px] font-900 text-ink-700 dark:text-ink-200">{t("hub_placeholder_title")}</p>
          <p className="max-w-[280px] text-[15px] font-700 text-ink-400">{t("hub_placeholder_body")}</p>
        </div>
      </div>
      </div>
    </PullToRefresh>
  );
}
