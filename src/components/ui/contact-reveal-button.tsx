"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Phone } from "lucide-react";
import { revealTripContact, revealRequestContact, type RevealedContact } from "@/lib/api/contacts";
import { extractError } from "@/lib/api/client";
import { useAuth } from "@/store/auth";
import { saveDeferredAction } from "@/lib/auth/deferred-action";
import { Spinner } from "@/components/ui";
import { toastError } from "@/components/layout/quick-toast";
import { whatsappUrl } from "@/lib/places";
import { cn } from "@/lib/utils/cn";
import { ContactActions, WhatsAppIcon } from "./contact-actions";

// Call-first flow (Yandex Межгород pattern): «Позвонить» or «WhatsApp». The
// first tap reveals the counterparty's number (audited + rate-limited server
// side) and acts on it; the number is kept for the session, so a second action
// on the same listing never costs another reveal. Guests go to login.

type Action = "call" | "whatsapp";
const cacheKey = (target: string, id: string) => `terme_contact:${target}:${id}`;

function readCached(target: string, id: string): RevealedContact | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(target, id));
    return raw ? (JSON.parse(raw) as RevealedContact) : null;
  } catch {
    return null;
  }
}

function act(action: Action, phone: string) {
  if (action === "call") window.location.href = `tel:${phone}`;
  else {
    // After the async reveal the tap's user activation may be gone and Safari
    // blocks the popup — fall back to opening WhatsApp in this tab.
    const w = window.open(whatsappUrl(phone), "_blank");
    if (w) w.opener = null;
    else window.location.href = whatsappUrl(phone);
  }
}

interface Props {
  target: "trip" | "request";
  id: string;
  className?: string;
  /** "icon" — compact buttons for list cards (errors go to a toast). */
  variant?: "full" | "icon";
}

export function ContactRevealButton({ target, id, className, variant = "full" }: Props) {
  const t = useTranslations("contact");
  const router = useRouter();
  const authed = useAuth((s) => s.status === "authenticated");
  const [contact, setContact] = useState<RevealedContact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setContact(readCached(target, id)), [target, id]);

  const { mutate, isPending, variables } = useMutation({
    mutationFn: (_action: Action) =>
      target === "trip" ? revealTripContact(id) : revealRequestContact(id),
    onSuccess: (c, action) => {
      setContact(c);
      try {
        sessionStorage.setItem(cacheKey(target, id), JSON.stringify(c));
      } catch {
        /* private mode */
      }
      act(action, c.phone);
    },
    onError: (e) => {
      const err = extractError(e) as { code?: string; details?: { reason?: string } };
      const msg =
        err.code === "RATE_LIMITED"
          ? t("limit_reached")
          : err.details?.reason === "no_phone"
            ? t("no_phone")
            : err.code === "TRIP_NOT_ACTIVE" || err.code === "CONFLICT" || err.code === "NOT_FOUND"
              ? t("not_active")
              : t("error");
      if (variant === "icon") toastError(msg);
      else setError(msg);
    },
  });

  const run = (action: Action) => {
    if (!authed) {
      // Come back to this listing after login (not the home feed).
      saveDeferredAction(target === "trip" ? { action: "view_trip", id } : { action: "view_request", id });
      router.push("/auth/login");
      return;
    }
    setError(null);
    if (contact) act(action, contact.phone);
    else mutate(action);
  };

  if (variant === "icon") {
    if (contact) return <ContactActions phone={contact.phone} compact className={className} />;
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <button
          type="button"
          aria-label={t("call")}
          title={t("call")}
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            run("call");
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100 disabled:opacity-60 dark:bg-brand-500/15 dark:text-brand-300"
        >
          {isPending && variables === "call" ? (
            <Spinner size={14} />
          ) : (
            <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          aria-label={t("whatsapp")}
          title={t("whatsapp")}
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            run("whatsapp");
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E] transition-colors hover:bg-[#25D366]/25 disabled:opacity-60"
        >
          {isPending && variables === "whatsapp" ? (
            <Spinner size={14} />
          ) : (
            <WhatsAppIcon className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => run("call")}
          disabled={isPending}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-[15px] font-900 text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending && variables === "call" ? (
            <Spinner size={16} />
          ) : (
            <Phone className="h-4 w-4" aria-hidden="true" />
          )}
          {t("call")}
        </button>
        <button
          type="button"
          onClick={() => run("whatsapp")}
          disabled={isPending}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-[15px] font-900 text-white transition-colors hover:bg-[#1EBE5A] disabled:opacity-60"
        >
          {isPending && variables === "whatsapp" ? (
            <Spinner size={16} />
          ) : (
            <WhatsAppIcon className="h-4 w-4" />
          )}
          {t("whatsapp")}
        </button>
      </div>
      {contact ? (
        <p className="mt-1.5 text-center text-[14px] font-800 text-ink-600 dark:text-ink-300">
          {contact.phone}
        </p>
      ) : !error ? (
        <p className="mt-1.5 text-center text-[13px] font-600 text-ink-400">
          {authed ? t("hint") : t("hint_guest")}
        </p>
      ) : null}
      {error && <p className="mt-1.5 text-center text-[13px] font-700 text-coral-600">{error}</p>}
    </div>
  );
}
