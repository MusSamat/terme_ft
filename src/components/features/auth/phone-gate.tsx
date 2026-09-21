"use client";

import { useEffect, useState } from "react";
import { detectRuntime } from "@/lib/detect-runtime";
import { useAuth } from "@/store/auth";
import { AddPhoneModal } from "@/components/features/auth/add-phone-modal";

/**
 * Telegram Mini App phone collector. Silent login auto-registers a Telegram user
 * with a placeholder phone (Telegram never shares the number in initData), so we
 * proactively ask for a real one right after login. One prompt per session:
 * dismissible (so it isn't hostile), but re-shows next open until a phone is set.
 * Hard enforcement still lives at the action layer (requirePhone on the backend).
 */
export function PhoneGate() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const needsPhone =
    status === "authenticated" && !!user && !user.phoneVerified && detectRuntime() === "telegram";

  useEffect(() => {
    if (needsPhone && !dismissed) setOpen(true);
  }, [needsPhone, dismissed]);

  if (!needsPhone) return null;

  return (
    <AddPhoneModal
      open={open}
      onClose={() => {
        setOpen(false);
        setDismissed(true);
      }}
      onDone={() => setOpen(false)}
    />
  );
}
