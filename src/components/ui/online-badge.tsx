"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getOnline } from "@/lib/api/presence";
import { cn } from "@/lib/utils/cn";

// Hide the badge below this many real online users — small numbers read as
// "dead" and hurt trust. Env-overridable; never fabricates the count.
const MIN = Number(process.env.NEXT_PUBLIC_ONLINE_MIN ?? 10);

/**
 * Live "N online" pill — a pulsing green dot + real, server-counted number.
 * Renders nothing until the count reaches MIN. Poll every 20s, refresh on focus.
 */
export function OnlineBadge({ className }: { className?: string }) {
  const t = useTranslations("presence");
  const { data: online } = useQuery({
    queryKey: ["presence", "online"],
    queryFn: getOnline,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  if (online == null || online < MIN) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/10 px-2.5 py-1 text-[13px] font-700 text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300",
        className,
      )}
      role="status"
      aria-live="polite"
      title={t("online_title", { count: online })}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
      </span>
      <span className="tabular-nums">{online.toLocaleString("ru-RU")}</span>
      <span className="hidden text-brand-600/90 dark:text-brand-300/90 sm:inline">
        {t("online")}
      </span>
    </div>
  );
}
