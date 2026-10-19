"use client";

import { useInfiniteQuery, useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Award } from "lucide-react";
import { getLoyaltyStatus, getLoyaltyTransactions } from "@/lib/api/loyalty";
import { useInfiniteScroll } from "@/lib/hooks/use-infinite-scroll";
import { Container, PullToRefresh, QueryError, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

const TIERS = ["novice", "traveler", "expert", "elite"] as const;
type Tier = (typeof TIERS)[number];

const TIER_COLORS: Record<Tier, {
  textColor: string;
  bgColor: string;
  ringColor: string;
  progressBg: string;
  borderColor: string;
}> = {
  novice:   { textColor: "text-ink-600 dark:text-ink-300",     bgColor: "bg-ink-100 dark:bg-ink-800",         ringColor: "ring-ink-400 dark:ring-ink-500",    progressBg: "bg-ink-500",     borderColor: "border-ink-200 dark:border-ink-700"      },
  traveler: { textColor: "text-brand-700 dark:text-brand-300", bgColor: "bg-brand-50 dark:bg-brand-500/10",   ringColor: "ring-brand-400",                    progressBg: "bg-brand-500",   borderColor: "border-brand-200 dark:border-brand-500/30" },
  expert:   { textColor: "text-brand-800 dark:text-brand-200", bgColor: "bg-brand-100 dark:bg-brand-500/20",  ringColor: "ring-brand-600",                    progressBg: "bg-brand-700",   borderColor: "border-brand-300 dark:border-brand-500/40" },
  elite:    { textColor: "text-accent-700 dark:text-accent-300", bgColor: "bg-accent-50 dark:bg-accent-500/10", ringColor: "ring-accent-400",                 progressBg: "bg-accent-500",  borderColor: "border-accent-200 dark:border-accent-500/30" },
};

// Backend POINTS_PER_TRIP = 10 for the driver and every passenger of a
// completed trip; there is no rating bonus.
const HOW_TO_EARN_ICONS = ["🚗", "🎯"] as const;
const HOW_TO_EARN_POINTS = ["+10", "+10"] as const;

export default function LoyaltyPage() {
  const t = useTranslations("loyalty");

  const sourceLabels: Record<string, string> = {
    trip_completed: t("sources.trip_completed"),
    bonus:          t("sources.bonus"),
    manual:         t("sources.manual"),
    referral:       t("sources.referral"),
  };
  const statusQuery = useQuery({
    queryKey: ["loyalty", "status"],
    queryFn: getLoyaltyStatus,
    staleTime: 60_000,
  });
  const { data: status, isLoading: statusLoading } = statusQuery;

  const txQuery = useInfiniteQuery({
    queryKey: ["loyalty", "transactions"],
    queryFn: ({ pageParam }) => getLoyaltyTransactions(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const sentinel = useInfiniteScroll({
    hasNextPage: txQuery.hasNextPage,
    isFetchingNextPage: txQuery.isFetchingNextPage,
    fetchNextPage: txQuery.fetchNextPage,
  });

  const transactions = txQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const tier = (status?.tier ?? "novice") as Tier;
  const cfg = TIER_COLORS[tier];
  const tierIndex = TIERS.indexOf(tier);
  const progress = status
    ? status.pointsToNextTier != null
      ? Math.round((status.points / (status.points + status.pointsToNextTier)) * 100)
      : 100
    : 0;

  return (
    <PullToRefresh
      onRefresh={async () => {
        await Promise.all([statusQuery.refetch(), txQuery.refetch()]);
      }}
    >
      <Container className="py-6 sm:py-8">
      <h1 className="mb-5 font-disp text-[22px] font-900 text-ink-900 dark:text-white sm:text-[26px]">
        {t("title")}
      </h1>

      {statusLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : statusQuery.isError ? (
        <QueryError error={statusQuery.error} onRetry={() => void statusQuery.refetch()} />
      ) : (
        <>
          {/* ── Status card ── */}
          <div className={cn("mb-4 rounded-3xl border p-6 shadow-card", cfg.bgColor, cfg.borderColor)}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Award className={cn("h-5 w-5", cfg.textColor)} aria-hidden="true" />
                  <span className={cn("text-[13px] font-800 uppercase tracking-widest", cfg.textColor)}>
                    {t(`tiers.${tier}`)}
                  </span>
                </div>
                <p className="mt-2 leading-none">
                  <span className="font-disp text-[40px] font-900 text-ink-900 dark:text-white">{status?.points ?? 0}</span>
                  <span className="ml-2 text-[17px] font-700 text-ink-500 dark:text-ink-400">{t("points_suffix")}</span>
                </p>
              </div>
            </div>

            {status?.nextTier && status.pointsToNextTier != null && (
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-[14px] font-700">
                  <span className="text-ink-600 dark:text-ink-300">
                    {t("to_next_tier", { tier: t(`tiers.${status.nextTier as Tier}`) })}
                  </span>
                  <span className={cfg.textColor}>{t("points_remaining", { n: status.pointsToNextTier })}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/60 dark:bg-ink-950/40">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", cfg.progressBg)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {!status?.nextTier && (
              <p className={cn("mt-4 text-[14px] font-800", cfg.textColor)}>
                {t("max_tier_reached")}
              </p>
            )}
          </div>

          {/* ── Tier roadmap ── */}
          <div className="mb-4 rounded-3xl border border-ink-100 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <h2 className="mb-5 font-disp text-[16px] font-900 text-ink-900 dark:text-white">{t("tiers_section")}</h2>
            <div className="relative flex items-start">
              {/* Track line */}
              <div className="absolute left-[18px] right-[18px] top-[18px] h-0.5 bg-ink-200 dark:bg-ink-700" />
              {tierIndex > 0 && (
                <div
                  className="absolute left-[18px] top-[18px] h-0.5 bg-brand-400 transition-all duration-700"
                  style={{ width: `calc(${(tierIndex / (TIERS.length - 1)) * 100}% - 0px)` }}
                />
              )}

              {TIERS.map((tierKey, i) => {
                const tcfg = TIER_COLORS[tierKey];
                const isActive = tierKey === tier;
                const isDone = i < tierIndex;
                return (
                  <div key={tierKey} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full ring-2",
                      isDone  ? "bg-brand-500 ring-brand-300" :
                      isActive ? cn(tcfg.bgColor, tcfg.ringColor) :
                                 "bg-white ring-ink-200 dark:bg-ink-800 dark:ring-ink-700",
                    )}>
                      <Award className={cn(
                        "h-4 w-4",
                        isDone   ? "text-white" :
                        isActive ? tcfg.textColor :
                                   "text-ink-300 dark:text-ink-600",
                      )} aria-hidden="true" />
                    </div>
                    <span className={cn(
                      "text-center text-[11px] font-800 leading-tight",
                      isDone   ? "text-brand-700 dark:text-brand-300" :
                      isActive ? tcfg.textColor :
                                 "text-ink-400",
                    )}>
                      {t(`tiers.${tierKey}`)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── How to earn ── */}
          <div className="mb-4 rounded-3xl border border-ink-100 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <h2 className="mb-4 font-disp text-[16px] font-900 text-ink-900 dark:text-white">{t("how_to_earn_section")}</h2>
            <div className="flex flex-col divide-y divide-ink-100 dark:divide-ink-800">
              {(["driver", "passenger"] as const).map((key, idx) => (
                <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[20px]" aria-hidden="true">{HOW_TO_EARN_ICONS[idx]}</span>
                    <span className="text-[15px] font-700 text-ink-700 dark:text-ink-200">{t(`earn.${key}`)}</span>
                  </div>
                  <span className="text-[15px] font-900 text-brand-700 dark:text-brand-300">{HOW_TO_EARN_POINTS[idx]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Transaction history ── */}
          <div className="rounded-3xl border border-ink-100 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
            <div className="border-b border-ink-100 px-5 py-4 dark:border-ink-800">
              <h2 className="font-disp text-[16px] font-900 text-ink-900 dark:text-white">{t("history_section")}</h2>
            </div>

            {txQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner size={20} />
              </div>
            ) : txQuery.isError ? (
              <QueryError
                error={txQuery.error}
                onRetry={() => void txQuery.refetch()}
                className="m-4 shadow-none ring-0"
              />
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[15px] font-700 text-ink-600 dark:text-ink-300">{t("empty_title")}</p>
                <p className="mt-1 text-[13px] text-ink-400">{t("empty_hint")}</p>
              </div>
            ) : (
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-700 text-ink-900 dark:text-white">
                        {sourceLabels[tx.source] ?? tx.source}
                      </p>
                      {tx.note && (
                        <p className="truncate text-[12px] text-ink-500 dark:text-ink-400">{tx.note}</p>
                      )}
                      <p className="text-[12px] text-ink-400">
                        {new Date(tx.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className={cn(
                      "ml-3 flex-shrink-0 text-[17px] font-900",
                      tx.points > 0 ? "text-brand-600 dark:text-brand-400" : "text-ink-500 dark:text-ink-400",
                    )}>
                      {tx.points > 0 ? "+" : ""}{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {txQuery.isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <Spinner size={16} />
              </div>
            )}
            <div ref={sentinel} />
          </div>
        </>
      )}
    </Container>
    </PullToRefresh>
  );
}
