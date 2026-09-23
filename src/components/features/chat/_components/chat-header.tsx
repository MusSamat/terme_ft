"use client";

import Link from "next/link";
import { ArrowLeft, CarFront, Phone, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { DriverAvatar } from "@/components/ui";

interface Props {
  otherUserId?: string;
  otherName: string;
  otherAvatarUrl: string | null;
  otherPhone?: string;
  bookingStatus?: string;
  tripRoute?: string;
  /** When present, the header links to the trip the chat is about. */
  tripId?: string;
  connected: boolean;
  typingUserId: string | null;
}

export function ChatHeader({
  otherUserId,
  otherName,
  otherAvatarUrl,
  otherPhone,
  bookingStatus,
  tripRoute,
  tripId,
  connected,
  typingUserId,
}: Props) {
  const t = useTranslations("chat");
  const isConfirmed = bookingStatus === "accepted";

  // Priority: live typing state > trip context (route) > status
  const subtitle = typingUserId
    ? t("typing")
    : tripRoute ??
      (isConfirmed ? t("booking_confirmed") : connected ? t("online") : t("connecting"));

  const nameBlock = (
    <>
      <DriverAvatar name={otherName} src={otherAvatarUrl} size="md" />
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="truncate text-[15px] font-900 text-ink-900 dark:text-white">{otherName}</p>
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
        </div>
        <p
          className={
            isConfirmed
              ? "text-[14px] font-700 text-brand-600 dark:text-brand-300"
              : "text-[14px] font-700 text-ink-500 dark:text-ink-400"
          }
        >
          {subtitle}
        </p>
      </div>
    </>
  );

  return (
    <div className="flex shrink-0 items-center gap-3 bg-white px-4 pb-3 pt-[calc(env(safe-area-inset-top)+10px)] ring-1 ring-ink-100 md:pt-3.5 dark:bg-ink-900 dark:ring-ink-800">
      <Link
        href="/chat"
        aria-label={t("back")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-900 hover:bg-ink-100 lg:hidden dark:text-white dark:hover:bg-ink-800"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </Link>

      {otherUserId ? (
        <Link href={`/drivers/${otherUserId}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
          {nameBlock}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{nameBlock}</div>
      )}

      {/* Context link — open the trip/request this conversation is about. */}
      {tripId && (
        <Link
          href={`/trips/${tripId}`}
          aria-label={t("to_trip")}
          title={t("to_trip")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
        >
          <CarFront className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}

      {isConfirmed && otherPhone && (
        <a
          href={`tel:${otherPhone}`}
          aria-label={t("call")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
