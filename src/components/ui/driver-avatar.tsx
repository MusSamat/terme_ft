"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { normalizeMediaUrl } from "@/lib/utils/media-url";

// Letter avatar — design-spec §1.7: teal tint, font-900; optional verified
// overlay dot (brand-600 circle + white check).

interface DriverAvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "square";
  /** brand check-dot overlay (bottom-right) */
  verified?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-[11px]",
  sm: "h-8 w-8 text-[12px]",
  md: "h-10 w-10 text-[16px]",
  lg: "h-14 w-14 text-[20px]",
  xl: "h-16 w-16 text-[21px]",
} as const;

const sizePx = { xs: 24, sm: 32, md: 40, lg: 56, xl: 64 } as const;

const shapeClasses = {
  circle: "rounded-full",
  square: "rounded-2xl",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function DriverAvatar({
  name,
  src,
  size = "sm",
  shape = "circle",
  verified,
  className,
}: DriverAvatarProps) {
  const [failed, setFailed] = useState(false);

  // Reset failed state when src changes (new upload or data refresh)
  useEffect(() => { setFailed(false); }, [src]);

  const base = cn(
    "inline-flex h-full w-full items-center justify-center bg-brand-100 font-900 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300",
    shapeClasses[shape],
  );

  const normalizedSrc = normalizeMediaUrl(src);

  return (
    <span className={cn("relative inline-flex shrink-0", sizeClasses[size], className)}>
      {normalizedSrc && !failed ? (
        <span className={cn(base, "overflow-hidden")}>
          <Image
            src={normalizedSrc}
            alt={name}
            width={sizePx[size]}
            height={sizePx[size]}
            sizes={`${sizePx[size]}px`}
            className="h-full w-full object-cover"
            // Optimize in prod (remotePatterns cover the media hosts); keep
            // unoptimized in dev where the backend serves raw files.
            unoptimized={process.env.NODE_ENV !== "production"}
            onError={() => setFailed(true)}
          />
        </span>
      ) : (
        <span className={base} aria-label={name}>
          {initials(name)}
        </span>
      )}
      {verified && (
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand-600 ring-2 ring-white dark:ring-ink-900"
        >
          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}
