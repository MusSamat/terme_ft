"use client";

import { useTranslations } from "next-intl";
import { Phone } from "lucide-react";
import { whatsappUrl } from "@/lib/places";
import { cn } from "@/lib/utils/cn";

/** WhatsApp glyph (brand mark is not in lucide). */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.88.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1 15.33-12.2 9.8 9.8 0 0 1 2.89 6.98c0 5.45-4.44 9.85-9.84 9.85M20.43 3.49A11.82 11.82 0 0 0 12.05 0C5.5 0 .17 5.33.16 11.88c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.33 11.89-11.88 0-3.17-1.24-6.16-3.5-8.43" />
    </svg>
  );
}

// «Позвонить» + «Написать в WhatsApp» for a known phone (accepted booking,
// chat header, revealed listing contact).
export function ContactActions({
  phone,
  compact = false,
  className,
}: {
  phone: string;
  /** Round icon buttons (chat header, list cards). */
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("contact");
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <a
          href={`tel:${phone}`}
          onClick={stop}
          aria-label={t("call")}
          title={t("call")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
        </a>
        <a
          href={whatsappUrl(phone)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          aria-label={t("whatsapp")}
          title={t("whatsapp")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366]/25"
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>
      </div>
    );
  }
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <a
        href={`tel:${phone}`}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink-900 text-[15px] font-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        {t("call")}
      </a>
      <a
        href={whatsappUrl(phone)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-[15px] font-900 text-white hover:bg-[#1EBE5A]"
      >
        <WhatsAppIcon className="h-4 w-4" />
        {t("whatsapp")}
      </a>
    </div>
  );
}
