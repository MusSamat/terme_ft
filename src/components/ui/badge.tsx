import { cva, type VariantProps } from "class-variance-authority";
import { ShieldCheck, Users, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold",
  {
    variants: {
      variant: {
        verified: "bg-brand-50 text-brand-700",
        pending: "bg-accent-100 text-accent-700",
        seats: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
        neutral: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
        success: "bg-brand-50 text-brand-700",
        danger: "bg-danger-100 text-danger-600",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: ReactNode;
}

export function Badge({ className, variant, icon, children, ...rest }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}

export function VerifiedBadge() {
  const t = useTranslations("badge");
  return (
    <Badge variant="verified" icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}>
      {t("verified")}
    </Badge>
  );
}

export function PendingBadge() {
  const t = useTranslations("badge");
  return (
    <Badge variant="pending" icon={<Clock className="h-3.5 w-3.5" aria-hidden="true" />}>
      {t("pending")}
    </Badge>
  );
}

export function SeatsBadge({ available, total }: { available: number; total: number }) {
  const t = useTranslations("badge");
  return (
    <Badge variant="seats" icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}>
      {t("of", { available, total })}
    </Badge>
  );
}
