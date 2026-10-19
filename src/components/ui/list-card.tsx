import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, TimerOff } from "lucide-react";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils/cn";

// Unified «Мои» / Requests card — one shape for bookings, trips, requests and
// favourites (1:1 with the Flutter ListCard). Head row: type dot + one-format
// date + role chip + status pill; then the route; then an optional actor strip;
// then an optional action row. Only the info region navigates (href/onClick) —
// action buttons sit OUTSIDE it, so there are never nested interactive elements.
export interface ListCardProps {
  when: string;
  role?: string;
  status?: StatusBadgeStatus | (string & {});
  origin: string;
  destination: string;
  avatar?: ReactNode;
  actorName?: string;
  actorSub?: ReactNode;
  trailing?: ReactNode;
  actions?: ReactNode;
  href?: string;
  onClick?: () => void;
  dimmed?: boolean;
  ribbon?: string;
}

export function ListCard({
  when,
  role,
  status,
  origin,
  destination,
  avatar,
  actorName,
  actorSub,
  trailing,
  actions,
  href,
  onClick,
  dimmed,
  ribbon,
}: ListCardProps) {
  const hasStrip = avatar || actorName || actorSub || trailing;

  const info = (
    <>
      {/* Head: type dot · date · role chip · status pill. The left group
          truncates so a long status label never overflows the row on mobile. */}
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span className="num shrink-0 text-[12px] font-800 text-ink-600 dark:text-ink-300">{when}</span>
          {role && (
            <span className="truncate rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-800 text-ink-500 dark:bg-ink-800">
              {role}
            </span>
          )}
        </div>
        {status && (
          <span className="shrink-0">
            <StatusBadge status={status} />
          </span>
        )}
      </div>

      {/* Route — full width, truncated city names */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="min-w-0 truncate text-[18px] font-900 text-ink-900 dark:text-white">{origin}</span>
        <ArrowRight className="h-[15px] w-[15px] shrink-0 text-ink-500" aria-hidden="true" />
        <span className="min-w-0 truncate text-[18px] font-900 text-ink-900 dark:text-white">{destination}</span>
      </div>

      {/* Actor strip */}
      {hasStrip && (
        <div className="mt-3 flex items-center gap-2.5 border-t border-ink-100 pt-3 dark:border-ink-800">
          {avatar}
          {(actorName || actorSub) && (
            <div className="min-w-0 flex-1">
              {actorName && <p className="truncate text-[13.5px] font-800 text-ink-900 dark:text-white">{actorName}</p>}
              {actorSub && <div className="mt-0.5 min-w-0">{actorSub}</div>}
            </div>
          )}
          {trailing && <div className="ml-auto shrink-0">{trailing}</div>}
        </div>
      )}
    </>
  );

  let clickable: ReactNode;
  if (href) {
    clickable = (
      <Link href={href} className="block">
        {info}
      </Link>
    );
  } else if (onClick) {
    clickable = (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className="block cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        {info}
      </div>
    );
  } else {
    clickable = info;
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "rounded-[18px] bg-white p-3.5 shadow-card ring-1 ring-ink-200 transition dark:bg-ink-900 dark:ring-ink-800",
          (href || onClick) && "hover:-translate-y-0.5 hover:shadow-lift",
          dimmed && "pointer-events-none opacity-55",
        )}
      >
        {clickable}
        {actions && <div className="mt-3 flex gap-2">{actions}</div>}
      </div>

      {ribbon && (
        <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-ink-700 px-2.5 py-1 text-[11px] font-900 text-white">
          <TimerOff className="h-3 w-3" aria-hidden="true" />
          {ribbon}
        </span>
      )}
    </div>
  );
}

type ListBtnKind = "primary" | "ghost" | "danger";

// Full-width action button for ListCard. Primary = neutral filled.
export function ListCardButton({
  label,
  onClick,
  icon,
  kind = "ghost",
  disabled,
}: {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  kind?: ListBtnKind;
  disabled?: boolean;
}) {
  const styles: Record<ListBtnKind, string> = {
    primary: "bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100",
    ghost: "border border-ink-200 bg-white text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100",
    danger: "border border-danger-200 bg-white text-danger-600 hover:bg-danger-50 dark:border-danger-500/40 dark:bg-ink-900",
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      disabled={disabled}
      className={cn(
        "flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-800 transition disabled:opacity-50",
        styles[kind],
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
