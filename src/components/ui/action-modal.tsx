"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Modal, ModalContent, ModalDescription, ModalTitle, ModalTrigger } from "./modal";

// Confirmation / result modal — design-spec §3 (book / sent / published /
// offline / error): centered card, tinted icon medallion, title, body,
// stacked action buttons.

export type ActionModalTone = "brand" | "accent" | "danger" | "ink";

// Literal medallion tint map — never interpolate color names into classes.
const MEDALLION: Record<ActionModalTone, string> = {
  brand: "bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  accent: "bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300",
  danger: "bg-danger-100 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400",
  ink: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
};

export interface ActionModalProps {
  tone?: ActionModalTone;
  icon: LucideIcon;
  title: ReactNode;
  /** body copy / extra content under the title */
  children?: ReactNode;
  /** primary action button (place a full-width Button) */
  primary?: ReactNode;
  /** secondary action button, stacked under the primary */
  secondary?: ReactNode;
  /** controlled open state (Radix Root) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** optional trigger element (rendered asChild) */
  trigger?: ReactNode;
  className?: string;
}

export function ActionModal({
  tone = "brand",
  icon: Icon,
  title,
  children,
  primary,
  secondary,
  open,
  onOpenChange,
  trigger,
  className,
}: ActionModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {trigger && <ModalTrigger asChild>{trigger}</ModalTrigger>}
      <ModalContent hideCloseButton className={cn("max-w-[380px] p-6 text-center", className)}>
        <span
          aria-hidden="true"
          className={cn(
            "mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full",
            MEDALLION[tone],
          )}
        >
          <Icon className="h-8 w-8" />
        </span>
        <ModalTitle className="text-[18px] font-900 leading-snug">{title}</ModalTitle>
        {children && (
          <ModalDescription asChild>
            <div className="mx-auto mt-1.5 max-w-[260px] text-[15px] font-700 text-ink-500 dark:text-ink-400">
              {children}
            </div>
          </ModalDescription>
        )}
        {(primary || secondary) && (
          <div className="mt-5 space-y-2">
            {primary}
            {secondary}
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
