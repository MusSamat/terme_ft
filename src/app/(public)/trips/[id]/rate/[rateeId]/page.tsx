"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DRIVER_TAGS,
  PASSENGER_TAGS,
  getPendingRatings,
  submitRating,
  type SubmitRatingInput,
} from "@/lib/api/ratings";
import { Button, QueryError, Spinner, Textarea, DriverAvatar } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils/cn";
import { saveDeferredAction } from "@/lib/auth/deferred-action";

const MAX_COMMENT = 500;

interface Props {
  params: { id: string; rateeId: string };
}

export default function RatePage({ params }: Props) {
  const { id: tripId, rateeId } = params;
  const router = useRouter();
  const t = useTranslations("rate");
  const fe = useFriendlyError();
  const qc = useQueryClient();
  const tTags = useTranslations("ratings.tags");
  const status = useAuth((s) => s.status);

  useEffect(() => {
    if (status === "anonymous") {
      saveDeferredAction({ action: "rate_user", trip_id: tripId, ratee_id: rateeId });
      router.replace("/auth/login");
    }
  }, [status, tripId, rateeId, router]);

  const pendingQuery = useQuery({
    queryKey: ["ratings", "pending"],
    queryFn: getPendingRatings,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
  const { data: pendingList, isLoading } = pendingQuery;

  const pending = useMemo(
    () => pendingList?.data.find((p) => p.tripId === tripId && p.counterpartId === rateeId),
    [pendingList, tripId, rateeId],
  );

  const [score, setScore] = useState<1 | 2 | 3 | 4 | 5 | 0>(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const tagList = pending?.direction === "driver" ? DRIVER_TAGS : PASSENGER_TAGS;

  const toggleTag = (v: string) =>
    setTags((prev) => (prev.includes(v) ? prev.filter((t) => t !== v) : [...prev, v]));

  const { mutate, isPending, error } = useMutation({
    mutationFn: (input: SubmitRatingInput) => submitRating(input),
    onSuccess: () => {
      setSubmitted(true);
      void qc.invalidateQueries({ queryKey: ["ratings", "pending"] });
      setTimeout(() => router.push("/my/bookings"), 2000);
    },
  });

  if (status === "loading" || status === "idle" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container max-w-lg py-16 text-center">
        {/* Animated stars burst */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-accent-100 opacity-60" style={{ animationDuration: "1.2s" }} />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent-50">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="absolute h-5 w-5 fill-accent-400 text-accent-400"
                style={{
                  transform: `rotate(${i * 72}deg) translateY(-36px)`,
                  animation: `cardIn 0.4s ease both`,
                  animationDelay: `${i * 80}ms`,
                }}
                aria-hidden="true"
              />
            ))}
            <span className="text-[32px]">🙌</span>
          </div>
        </div>
        <h1 className="text-[26px] font-extrabold text-ink-900 dark:text-white">{t("success_title")}</h1>
        <p className="mx-auto mt-3 max-w-[320px] text-[16px] leading-relaxed text-ink-600">
          {t("success_desc")}
        </p>
        <div className="mx-auto mt-6 h-1 w-20 rounded-full bg-accent-300" />
        <p className="mt-4 text-[14px] font-semibold text-ink-400">{t("success_redirect")}</p>
      </div>
    );
  }

  // Load failure ≠ "nothing to rate" — offer a retry instead of the
  // unavailable screen.
  if (pendingQuery.isError) {
    return (
      <div className="container max-w-lg py-20">
        <QueryError error={pendingQuery.error} onRetry={() => void pendingQuery.refetch()} />
      </div>
    );
  }

  if (!pending) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <h1 className="text-h1 text-ink-900 dark:text-white">{t("unavailable_title")}</h1>
        <p className="mt-2 text-body-lg text-ink-700 dark:text-ink-300">{t("unavailable_desc")}</p>
        <Button variant="primary" size="md" className="mt-6" onClick={() => router.push("/my/bookings")}>
          {t("my_bookings_link")}
        </Button>
      </div>
    );
  }

  const errMsg =
    error ? fe(extractError(error)) : null; // CONFLICT already_rated, rating_window_closed, …

  return (
    <div className="mx-auto max-w-[520px] px-4 py-8">
      <button
        type="button"
        onClick={() => router.push("/my/bookings")}
        className="mb-4 inline-flex items-center gap-1 text-[14px] font-bold text-ink-600 hover:text-ink-900"
      >
        {t("back")}
      </button>

      <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm dark:bg-ink-900 dark:border-ink-800">
        <div className="flex flex-col items-center gap-3 text-center">
          <DriverAvatar name={pending.counterpartName} size="lg" />
          <div>
            <h1 className="text-[22px] font-extrabold text-ink-900 dark:text-white">
              {t("question", { name: pending.counterpartName })}
            </h1>
          </div>
        </div>

        {/* Star score */}
        <div
          className="mt-6 flex items-center justify-center gap-2"
          role="radiogroup"
          aria-label={t("rating_aria")}
        >
          {([1, 2, 3, 4, 5] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={score === s}
              aria-label={t("star_aria", { n: s })}
              onClick={() => setScore(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={cn(
                  "h-11 w-11 transition-colors",
                  (hover || score) >= s ? "fill-accent-400 text-accent-400" : "text-ink-300",
                )}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[15px] font-semibold text-ink-500">
          {[t("label_0"), t("label_1"), t("label_2"), t("label_3"), t("label_4"), t("label_5")][score]}
        </p>

        {score > 0 && (
          <>
            {/* Tags */}
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-500">
                {score >= 4 ? t("liked") : t("disliked")}
              </p>
              <div className="flex flex-wrap gap-2">
                {tagList.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleTag(value)}
                    className={cn(
                      "rounded-full border-2 px-3 py-1 text-[13px] font-bold transition-colors",
                      tags.includes(value)
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-ink-300 text-ink-700 hover:border-brand-400 dark:border-ink-700 dark:text-ink-300",
                    )}
                  >
                    {tTags(labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="mt-4">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-ink-500">{t("comment_label")}</p>
              <Textarea
                rows={3}
                maxLength={MAX_COMMENT}
                placeholder={t("comment_placeholder")}
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
              />
              <p className="mt-1 text-right text-[12px] text-ink-400">{comment.length}/{MAX_COMMENT}</p>
            </div>

            {/* Mutual review notice */}
            <div className="mt-4 rounded-2xl bg-ink-50 p-3 dark:bg-ink-800">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-3.5 w-3.5 text-ink-700 flex-shrink-0 dark:text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8z"/><path d="m9 12 2 2 4-4"/></svg>
                <span className="text-[14px] font-bold text-ink-900 dark:text-white">{t("blind_title")}</span>
              </div>
              <p className="text-[14px] font-semibold text-ink-500">
                {t("blind_desc", { name: pending.counterpartName.split(" ")[0] })}
              </p>
            </div>

            {errMsg && (
              <p className="mt-3 rounded-xl bg-coral-50 px-4 py-2 text-[15px] font-semibold text-coral-700">{errMsg}</p>
            )}

            <Button
              variant="submit"
              size="lg"
              className="mt-5 w-full"
              disabled={score === 0 || isPending}
              onClick={() =>
                mutate({
                  tripId,
                  rateeId,
                  score: score as 1 | 2 | 3 | 4 | 5,
                  tags: tags.length ? tags : undefined,
                  comment: comment.trim() || undefined,
                })
              }
            >
              {isPending ? <Spinner size={18} /> : t("submit")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
