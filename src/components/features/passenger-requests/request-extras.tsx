"use client";

import { useTranslations } from "next-intl";
import { Luggage, Signpost } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Airport request extras: «Встретить с табличкой» and luggage pieces. */
export function hasRequestExtras(r: { meetWithSign?: boolean; luggageCount?: number | null }): boolean {
  return Boolean(r.meetWithSign) || (r.luggageCount ?? null) !== null;
}

export function RequestExtras({
  request,
  className,
}: {
  request: { meetWithSign?: boolean; luggageCount?: number | null };
  className?: string;
}) {
  const t = useTranslations("airport");
  if (!hasRequestExtras(request)) return null;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {request.meetWithSign && (
        <span className="inline-flex items-center gap-1">
          <Signpost className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("sign_short")}
        </span>
      )}
      {request.luggageCount != null && (
        <span className="inline-flex items-center gap-1">
          <Luggage className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("luggage_n", { n: request.luggageCount })}
        </span>
      )}
    </span>
  );
}
