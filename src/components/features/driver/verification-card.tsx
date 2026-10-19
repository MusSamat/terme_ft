"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { getDriverStatus } from "@/lib/api/profile";

// Единый блок «Верификация водителя» (Phase 1: значок доверия, не гейт).
// card — карточка в профиле «Авто»; inline — компактная строка рядом с
// добавлением авто (создание поездки). Статус берёт сам — везде одинаково.

export function VerificationCard({ variant = "card" }: { variant?: "card" | "inline" }) {
  const t = useTranslations("cars");
  const { data } = useQuery({
    queryKey: ["driver-status"],
    queryFn: getDriverStatus,
    staleTime: 60_000,
  });
  const verified = data?.status === "verified";
  // docs_requested is «in review» too, but the user must act — keep the CTA.
  const docsRequested = data?.status === "docs_requested";
  const pending = data?.status === "pending" || docsRequested;
  const locked = data?.status === "suspended" || data?.status === "blocked";

  if (variant === "inline") {
    if (verified || locked || (pending && !docsRequested)) return null;
    return (
      <Link
        href="/profile/driver"
        className="mt-2.5 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-[13px] font-700 text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
      >
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          {t("verif_title")} — {t("verif_text")}
        </span>
        <span className="shrink-0 font-800 underline">{t("verif_cta")}</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        {verified ? <BadgeCheck className="h-6 w-6" aria-hidden="true" /> : <ShieldCheck className="h-6 w-6" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-900 text-ink-900 dark:text-white">
          {verified ? t("verif_done_title") : pending ? t("verif_pending_title") : t("verif_title")}
        </span>
        <span className="block text-[13px] font-600 text-ink-500 dark:text-ink-400">
          {verified ? t("verif_done_text") : pending ? t("verif_pending_text") : t("verif_text")}
        </span>
      </span>
      {!verified && !locked && (!pending || docsRequested) && (
        <Link
          href="/profile/driver"
          className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-[14px] font-800 text-white transition-colors hover:bg-brand-700"
        >
          {t("verif_cta")}
        </Link>
      )}
    </div>
  );
}
