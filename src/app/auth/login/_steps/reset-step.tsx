import React from "react";
import { CheckCircle, Eye, EyeOff, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { useTranslations } from "next-intl";

interface Props {
  tl: ReturnType<typeof useTranslations<string>>;
  newPassword: string;
  setNewPassword: (p: string) => void;
  confirmPassword: string;
  setConfirmPassword: (p: string) => void;
  resetOtp: string;
  setResetOtp: (c: string) => void;
  serverError: string | null;
  setServerError: (e: string | null) => void;
  showNewPassword: boolean;
  setShowNewPassword: (fn: (v: boolean) => boolean) => void;
  newPasswordRef: React.RefObject<HTMLInputElement>;
  canReset: boolean;
  resetMutation: { isPending: boolean; mutate: () => void };
}

export function ResetStep({
  tl, newPassword, setNewPassword, confirmPassword, setConfirmPassword,
  resetOtp, setResetOtp,
  serverError: _serverError, setServerError, showNewPassword, setShowNewPassword,
  newPasswordRef, canReset, resetMutation,
}: Props) {
  return (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle className="h-6 w-6 text-brand-600" aria-hidden="true" />
        </div>
        <p className="text-[17px] font-800 text-ink-900 dark:text-white">{tl("reset_title")}</p>
        <p className="mt-1 text-[14px] font-600 text-ink-500">{tl("reset_min_chars")}</p>
      </div>

      {/* Fresh WhatsApp code — reset-password consumes a single-use OTP. */}
      <div className="mb-3 flex flex-col gap-1.5">
        <p className="flex items-center justify-center gap-1.5 text-center text-[13px] font-700 text-[#128C7E]">
          <MessageCircle className="h-4 w-4" />
          {tl("reset_code_hint")}
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={resetOtp}
          onChange={(e) => { setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setServerError(null); }}
          placeholder="— — — — — —"
          className="h-12 w-full rounded-2xl border-2 border-ink-200 bg-ink-50 px-4 text-center text-[20px] font-900 tracking-[0.3em] text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
        />
      </div>

      <div className="mb-3 flex flex-col gap-1.5">
        <div className="relative">
          <input
            ref={newPasswordRef}
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setServerError(null); }}
            placeholder={tl("new_password_placeholder")}
            className="h-12 w-full rounded-2xl border-2 border-ink-200 bg-ink-50 px-4 pr-10 text-[16px] font-800 text-ink-900 outline-none focus:border-brand-500 dark:bg-ink-800 dark:border-ink-700 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
            aria-label={showNewPassword ? tl("new_password_hide") : tl("new_password_show")}
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-1.5">
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setServerError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter" && canReset) resetMutation.mutate(); }}
          placeholder={tl("confirm_password_placeholder")}
          className={cn(
            "h-12 w-full rounded-2xl border-2 bg-ink-50 px-4 text-[16px] font-800 outline-none dark:bg-ink-800",
            confirmPassword && confirmPassword !== newPassword
              ? "border-coral-300 text-coral-700"
              : "border-ink-200 text-ink-900 focus:border-brand-500 dark:border-ink-700 dark:text-white",
          )}
        />
        {confirmPassword && confirmPassword !== newPassword && (
          <p className="text-[14px] font-600 text-coral-600">{tl("passwords_mismatch")}</p>
        )}
      </div>

      <button
        type="button"
        disabled={!canReset || resetMutation.isPending}
        onClick={() => resetMutation.mutate()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 text-[16px] font-700 text-[#4A2C00] shadow-cta transition-colors hover:bg-accent-400 disabled:opacity-40"
      >
        {resetMutation.isPending ? tl("saving") : tl("save_password")}
      </button>
    </>
  );
}
