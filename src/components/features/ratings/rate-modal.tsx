"use client";

import { useState } from "react";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Star, X } from "lucide-react";
import { DRIVER_TAGS, PASSENGER_TAGS, submitRating, type PendingRating } from "@/lib/api/ratings";
import { DriverAvatar, Spinner } from "@/components/ui";
import { Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

const MAX_COMMENT = 500;

interface Props {
  rating: PendingRating;
  onClose: () => void;
}

export function RateModal({ rating, onClose }: Props) {
  const qc = useQueryClient();
  const t = useTranslations("rate");
  const fe = useFriendlyError();
  const tTags = useTranslations("ratings.tags");
  const [score, setScore] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const tagList = rating.direction === "driver" ? DRIVER_TAGS : PASSENGER_TAGS;
  const toggleTag = (v: string) =>
    setTags((prev) => (prev.includes(v) ? prev.filter((t) => t !== v) : [...prev, v]));

  const { mutate, isPending, error } = useMutation({
    mutationFn: () =>
      submitRating({
        tripId: rating.tripId,
        rateeId: rating.counterpartId,
        score: score as 1 | 2 | 3 | 4 | 5,
        tags: tags.length ? tags : undefined,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      setSubmitted(true);
      void qc.invalidateQueries({ queryKey: ["ratings", "pending"] });
      setTimeout(onClose, 2000);
    },
  });

  const errMsg =
    error ? fe(extractError(error)) : null; // CONFLICT already_rated, rating_window_closed, …

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={submitted ? undefined : onClose}
      />

      {/* Sheet (mobile bottom) / Dialog (desktop centered) */}
      <div className="relative w-full overflow-y-auto rounded-t-[24px] bg-white shadow-2xl sm:max-w-[480px] sm:rounded-3xl"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-ink-200" />
        </div>

        {!submitted && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="px-6 pb-8 pt-2">
          {submitted ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
                <div
                  className="absolute inset-0 animate-ping rounded-full bg-accent-100 opacity-60"
                  style={{ animationDuration: "1.2s" }}
                />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent-50">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="absolute h-4 w-4 fill-accent-400 text-accent-400"
                      style={{ transform: `rotate(${i * 72}deg) translateY(-30px)` }}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="text-[28px]">🙌</span>
                </div>
              </div>
              <h2 className="text-[22px] font-extrabold text-ink-900">{t("success_title")}</h2>
              <p className="mx-auto mt-2 max-w-[280px] text-[15px] text-ink-600">
                {rating.direction === "driver"
                  ? t("success_role_driver")
                  : t("success_role_passenger")}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center gap-3 text-center">
                <DriverAvatar name={rating.counterpartName} size="lg" />
                <h2 className="text-[20px] font-extrabold text-ink-900">
                  {t("question", { name: rating.counterpartName })}
                </h2>
              </div>

              {/* Stars */}
              <div
                className="mb-2 flex items-center justify-center gap-2"
                role="radiogroup"
                aria-label={t("rating_aria")}
              >
                {([1, 2, 3, 4, 5] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={score === s}
                    onClick={() => setScore(s)}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={cn(
                        "h-11 w-11 transition-colors",
                        (hover || score) >= s
                          ? "fill-accent-400 text-accent-400"
                          : "text-ink-300",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              <p className="mb-5 text-center text-[15px] font-semibold text-ink-500">
                {t(`label_${score}`)}
              </p>

              {score > 0 && (
                <>
                  {/* Tags */}
                  <div className="mb-4">
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
                              : "border-ink-300 text-ink-700 hover:border-brand-400",
                          )}
                        >
                          {tTags(labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="mb-4">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-ink-500">
                      {t("comment_label")}
                    </p>
                    <Textarea
                      rows={3}
                      maxLength={MAX_COMMENT}
                      placeholder={t("comment_placeholder")}
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                    />
                    <p className="mt-1 text-right text-[13px] text-ink-400">
                      {comment.length}/{MAX_COMMENT}
                    </p>
                  </div>

                  {/* Mutual review notice */}
                  <div className="mb-4 rounded-2xl bg-ink-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <svg className="h-3.5 w-3.5 flex-shrink-0 text-ink-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      <span className="text-[14px] font-bold text-ink-900">{t("blind_title")}</span>
                    </div>
                    <p className="text-[14px] font-semibold text-ink-500">
                      {t("blind_desc", { name: rating.counterpartName.split(" ")[0] })}
                    </p>
                  </div>

                  {errMsg && (
                    <p className="mb-3 rounded-xl bg-coral-50 px-4 py-2 text-[15px] font-semibold text-coral-700">
                      {errMsg}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={score === 0 || isPending}
                    onClick={() => mutate()}
                    className="w-full rounded-2xl bg-accent-500 py-3.5 text-[16px] font-bold text-[#4A2C00] transition-colors hover:bg-accent-600 disabled:opacity-50"
                  >
                    {isPending ? <Spinner size={18} /> : t("submit")}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
