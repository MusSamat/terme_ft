"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ChatSummary } from "@/lib/api/chat";
import { DriverAvatar } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

const ACTIVE_CHAT_STATUSES = new Set(["pending", "viewed", "accepted"]);

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function ChatRow({ s, isActive }: { s: ChatSummary; isActive: boolean }) {
  const t = useTranslations("chat");
  const CLOSED_STATUS_LABEL: Record<string, string> = {
    completed:              t("status_completed"),
    rejected:               t("status_rejected"),
    cancelled_by_passenger: t("status_cancelled"),
    cancelled_by_driver:    t("status_cancelled"),
    cancelled_late:         t("status_cancelled"),
    no_show:                t("status_no_show"),
    expired:                t("status_expired"),
  };
  const isClosed = !ACTIVE_CHAT_STATUSES.has(s.bookingStatus);
  const closedLabel = CLOSED_STATUS_LABEL[s.bookingStatus] ?? t("archive");
  const hasUnread = !isClosed && s.unreadCount > 0;

  return (
    <Link
      href={`/my/bookings/${s.bookingId}/chat`}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800",
        isActive && "bg-brand-50 hover:bg-brand-50",
        isClosed && "opacity-60",
      )}
    >
      <div className="relative flex-shrink-0">
        <DriverAvatar name={s.otherName} src={s.otherAvatarUrl} size="sm" />
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[9px] font-900 leading-none text-white ring-2 ring-white dark:ring-ink-900">
            {s.unreadCount > 9 ? "9+" : s.unreadCount}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <span className={cn(
            "truncate text-[15px] font-bold",
            isActive ? "text-brand-900" : isClosed ? "text-ink-500" : hasUnread ? "text-ink-900 dark:text-white" : "text-ink-700 dark:text-ink-300",
          )}>
            {s.otherName}
          </span>
          {isClosed ? (
            <span className="flex-shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink-400">
              {closedLabel}
            </span>
          ) : s.lastMessageAt ? (
            <span className={cn(
              "flex-shrink-0 text-[14px] font-semibold",
              hasUnread ? "text-brand-600" : "text-ink-400",
            )}>
              {formatTime(s.lastMessageAt)}
            </span>
          ) : null}
        </div>
        <p className={cn(
          "truncate text-[14px] font-semibold",
          isClosed ? "text-ink-400" : "text-ink-500",
        )}>
          {/* Message preview once the conversation started; route until then. */}
          {s.lastMessage || s.route}
        </p>
      </div>
    </Link>
  );
}
