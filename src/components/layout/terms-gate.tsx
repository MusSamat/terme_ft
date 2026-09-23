"use client";

// Soft terms-acceptance gate: any authenticated user with termsAcceptedAt=null
// (e.g. accounts created via Telegram silent login, which bypasses the
// registration consent step) sees this modal. Accepting stamps termsAcceptedAt
// on the backend (permanent, all devices). "Later" is remembered in
// localStorage — per device, across tabs/logins — so the modal doesn't nag on
// every new tab (it used to live in sessionStorage, which is per-tab).

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/lib/api/auth";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui";

const DISMISS_KEY = "terme_terms_later";

export function TermsGate() {
  const t = useTranslations("terms_gate");
  const user = useAuth((s) => s.user);
  const status = useAuth((s) => s.status);
  const updateUser = useAuth((s) => s.updateUser);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const { mutate: accept, isPending } = useMutation({
    mutationFn: () => updateProfile({ termsAccepted: true }),
    onSuccess: (updated) => updateUser({ termsAcceptedAt: updated.termsAcceptedAt }),
  });

  const needsAcceptance =
    status === "authenticated" && user !== null && user.termsAcceptedAt == null;
  if (!needsAcceptance || dismissed) return null;

  const later = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-xl dark:bg-ink-900">
        <h2 className="text-[17px] font-900 text-ink-900 dark:text-white">{t("title")}</h2>
        <p className="mt-2 text-[15px] font-600 leading-relaxed text-ink-500 dark:text-ink-300">
          {t.rich("body", {
            terms: (chunks) => (
              <Link href="/terms" className="font-800 text-brand-600 underline" target="_blank">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="font-800 text-brand-600 underline" target="_blank">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <div className="mt-5 flex gap-2.5">
          <Button variant="secondary" size="md" className="flex-1" onClick={later} disabled={isPending}>
            {t("later")}
          </Button>
          <Button variant="primary" size="md" className="flex-1" onClick={() => accept()} disabled={isPending}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
