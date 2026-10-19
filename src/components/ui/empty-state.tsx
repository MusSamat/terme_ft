"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ICON, type IconName, type IconTone } from "./icon";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/store/auth";

/** Фон 64px круга под иконку — по мотивам словаря §10 (design-system §11 «Пусто»). */
const CIRCLE_TONE = {
  brand: "bg-brand-100 text-brand-600",
  accent: "bg-accent-100 text-accent-600",
  ink: "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300",
} as const satisfies Record<IconTone, string>;

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStateProps {
  icon: IconName;
  iconTone?: IconTone;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

/**
 * design-system §11 «Пусто»: центрированная карточка вместо пустого/белого экрана.
 * «Никаких белых экранов» — используем везде, где список/данные могут быть пустыми.
 */
export function EmptyState({ icon, iconTone = "brand", title, description, action, className }: EmptyStateProps) {
  const Glyph = ICON[icon];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl bg-ink-50 dark:bg-ink-900 px-4 py-8 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full",
          CIRCLE_TONE[iconTone],
        )}
      >
        <Glyph className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="text-[18px] font-900 text-ink-900 dark:text-white">{title}</p>
      {description ? <p className="text-[15px] font-700 leading-relaxed text-ink-500 dark:text-ink-400">{description}</p> : null}
      {action ? <EmptyStateCta action={action} /> : null}
    </div>
  );
}

const CTA_CLASS =
  "mt-1 inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-accent-500 px-5 text-[14px] font-900 text-accent-ink shadow-cta transition-colors hover:bg-accent-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2";

function EmptyStateCta({ action }: { action: EmptyStateAction }) {
  if (action.href) {
    return (
      <Link href={action.href} className={CTA_CLASS}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={CTA_CLASS}>
      {action.label}
    </button>
  );
}

export type RoleEmptyContext = "trips" | "requests" | "bookings";

export interface RoleEmptyStateProps {
  context: RoleEmptyContext;
  className?: string;
}

/**
 * Роле-зависимый EmptyState: сам читает useAuth() и подбирает копирайт + CTA
 * под гостя / пассажира / водителя. Тексты живут в namespace «empty».
 */
export function RoleEmptyState({ context, className }: RoleEmptyStateProps) {
  const t = useTranslations("empty");
  const status = useAuth((s) => s.status);
  const activeMode = useAuth((s) => s.activeMode);

  // GUEST — общий призыв войти, вне зависимости от контекста.
  if (status === "anonymous") {
    return (
      <EmptyState
        className={className}
        icon="login"
        iconTone="brand"
        title={t("guest.title")}
        description={t("guest.description")}
        action={{ label: t("guest.cta"), href: "/auth/login" }}
      />
    );
  }

  // DRIVER
  if (activeMode === "driver") {
    if (context === "requests") {
      return (
        <EmptyState
          className={className}
          icon="request"
          iconTone="brand"
          title={t("driver_requests.title")}
          description={t("driver_requests.description")}
          action={{ label: t("driver_requests.cta"), href: "/trips/create" }}
        />
      );
    }
    if (context === "bookings") {
      return (
        <EmptyState
          className={className}
          icon="trip"
          iconTone="brand"
          title={t("driver_bookings.title")}
          description={t("driver_bookings.description")}
          action={{ label: t("driver_bookings.cta"), href: "/trips/create" }}
        />
      );
    }
    // driver + trips
    return (
      <EmptyState
        className={className}
        icon="trip"
        iconTone="brand"
        title={t("driver_trips.title")}
        description={t("driver_trips.description")}
        action={{ label: t("driver_trips.cta"), href: "/trips/create" }}
      />
    );
  }

  // PASSENGER
  if (context === "bookings") {
    return (
      <EmptyState
        className={className}
        icon="myItems"
        iconTone="brand"
        title={t("passenger_bookings.title")}
        description={t("passenger_bookings.description")}
        action={{ label: t("passenger_bookings.cta"), href: "/trips" }}
      />
    );
  }
  if (context === "requests") {
    return (
      <EmptyState
        className={className}
        icon="request"
        iconTone="brand"
        title={t("passenger_requests.title")}
        description={t("passenger_requests.description")}
        action={{ label: t("passenger_requests.cta"), href: "/requests/create" }}
      />
    );
  }
  // passenger + trips
  return (
    <EmptyState
      className={className}
      icon="route"
      iconTone="brand"
      title={t("passenger_trips.title")}
      description={t("passenger_trips.description")}
      action={{ label: t("passenger_trips.cta"), href: "/requests/create" }}
    />
  );
}
