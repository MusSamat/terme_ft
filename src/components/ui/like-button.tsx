"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { likeTrip, unlikeTrip } from "@/lib/api/trips";
import { likePassengerRequest, unlikePassengerRequest } from "@/lib/api/passenger-requests";
import { useAuth } from "@/store/auth";
import { saveDeferredAction } from "@/lib/auth/deferred-action";
import { cn } from "@/lib/utils/cn";

type LikeCache = { liked?: boolean; metrics?: { likes: number } } & Record<string, unknown>;

interface LikeButtonProps {
  targetType: "trip" | "passenger_request";
  id: string;
  liked: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function LikeButton({ targetType, id, liked, className, size = "md" }: LikeButtonProps) {
  const t = useTranslations("engagement");
  const router = useRouter();
  const authStatus = useAuth((s) => s.status);
  const qc = useQueryClient();
  const [optimistic, setOptimistic] = useState(liked);

  // Re-sync with server truth after refetch/invalidation.
  useEffect(() => {
    setOptimistic(liked);
  }, [liked]);

  const mutation = useMutation({
    mutationFn: async (next: boolean): Promise<{ liked: boolean }> => {
      if (targetType === "trip") {
        return next ? likeTrip(id) : unlikeTrip(id);
      }
      return next ? likePassengerRequest(id) : unlikePassengerRequest(id);
    },
    // Optimistically adjust the displayed likes count on the trip-detail cache
    // so the number moves with the heart (not only after the refetch settles).
    onMutate: (next: boolean) => {
      if (targetType !== "trip") return;
      qc.setQueryData<LikeCache>(["trip", id], (old) =>
        old?.metrics
          ? { ...old, liked: next, metrics: { ...old.metrics, likes: Math.max(0, old.metrics.likes + (next ? 1 : -1)) } }
          : old,
      );
    },
    onError: () => setOptimistic((v) => !v),
    onSettled: () => {
      if (targetType === "trip") {
        void qc.invalidateQueries({ queryKey: ["trips"] });
        void qc.invalidateQueries({ queryKey: ["trip", id] });
      } else {
        void qc.invalidateQueries({ queryKey: ["passenger-requests"] });
      }
      // Favorites list (GET /users/me/likes) must reflect the toggle.
      void qc.invalidateQueries({ queryKey: ["likes", targetType] });
    },
  });

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (authStatus !== "authenticated") {
      // Remember what the guest tried to like → after login they land back on
      // the item (deferred action) instead of the home feed.
      saveDeferredAction({ action: "like", target_type: targetType, id });
      router.push("/auth/login");
      return;
    }
    const next = !optimistic;
    setOptimistic(next);
    mutation.mutate(next);
  };

  const iconCls = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const boxCls = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={optimistic}
      aria-label={optimistic ? t("unlike") : t("like")}
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-ink-800/80 text-ink-400 dark:text-ink-300 transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1",
        boxCls,
        className,
      )}
    >
      <Heart className={cn(iconCls, optimistic && "fill-brand-600 text-brand-600")} aria-hidden="true" />
    </button>
  );
}
