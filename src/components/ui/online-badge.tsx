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
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[13px] font-700 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
        className,
      )}
      role="status"
      aria-live="polite"
      title={t("online_title", { count: online })}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="tabular-nums">{online.toLocaleString("ru-RU")}</span>
      <span className="hidden text-emerald-600/90 dark:text-emerald-300/90 sm:inline">
        {t("online")}
      </span>
    </div>
  );
}
