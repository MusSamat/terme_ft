import { cva, type VariantProps } from "class-variance-authority";
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const notifVariants = cva("flex gap-3 rounded-2xl border-l-[4px] p-4", {
  variants: {
    variant: {
      info: "bg-brand-50 border-l-brand-500 text-ink-900",
      success: "bg-brand-50 border-l-brand-500 text-ink-900",
      warning: "bg-accent-50 border-l-accent-500 text-ink-900",
      error: "bg-danger-100/40 border-l-danger-500 text-ink-900",
    },
  },
  defaultVariants: { variant: "info" },
});

const iconColorMap = {
  info: "text-brand-700",
  success: "text-brand-600",
  warning: "text-accent-600",
  error: "text-danger-500",
} as const;

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
} as const;

interface NotifCardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof notifVariants> {
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function NotifCard({
  variant = "info",
  title,
  children,
  icon,
  className,
  ...rest
}: NotifCardProps) {
  const v = variant ?? "info";
  const Icon = iconMap[v];
  return (
    <div className={cn(notifVariants({ variant: v }), className)} {...rest}>
      <span className={cn("mt-0.5 flex-shrink-0", iconColorMap[v])} aria-hidden="true">
        {icon ?? <Icon className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-body font-bold">{title}</p>}
        <div className="text-body-lg text-ink-700">{children}</div>
      </div>
    </div>
  );
}
