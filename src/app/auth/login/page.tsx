"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, AlertTriangle } from "lucide-react";
import {
  loginWithPassword,
  resetPassword,
  sendOtp,
} from "@/lib/api/auth";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { consumeDeferredAction, routeForIntent } from "@/lib/auth/deferred-action";
import { useAuth } from "@/store/auth";
import { useTranslations } from "next-intl";
import { LogoMark, Wordmark, PhoneInput, Spinner } from "@/components/ui";
import { ResetStep } from "./_steps/reset-step";
import { cn } from "@/lib/utils/cn";
import { isValidPhone } from "@/lib/phone";

type Step = "login" | "forgot" | "reset";

/** Terme brand mark from the prototype (paper-plane + amber dot). */
function AuthLogo() {
  return <LogoMark className="mx-auto mb-4 h-16 w-16 rounded-3xl shadow-brandcta" />;
}

export default function LoginPage() {
  const tl = useTranslations("auth.login");
  const fe = useFriendlyError();
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const status = useAuth((s) => s.status);

  const [step, setStep] = useState<Step>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  // Single WhatsApp OTP for the whole forgot-password flow. We send ONE code and
  // feed it straight to /auth/phone/reset-password (which proves phone ownership
  // and sets the new password in one call) — no separate verify step, so we never
  // trip the 1-send-per-minute cap.
  const [resetOtp, setResetOtp] = useState("");
  // Sub-step of the "reset" screen: enter the code, then the new password.
  const [resetPhase, setResetPhase] = useState<"code" | "password">("code");
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  const passwordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  const canSubmitLogin = isValidPhone(phone) && password.length > 0;
  const canReset =
    newPassword.length >= 8 && newPassword === confirmPassword && resetOtp.length === 6;

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendSeconds]);


  // Prefill phone handed over from the register flow (?phone=+996...). When the
  // register screen bounced an existing account here with ?reset=1, kick off the
  // password-reset (send OTP) automatically.
  // window.location instead of useSearchParams — no Suspense boundary needed.
  useEffect(() => {
    // Prefill the phone ONLY. Never auto-send an OTP from a URL param — a
    // crafted ?reset=1 link would otherwise DM-bomb any valid-format number.
    // The user initiates the reset with an explicit tap.
    const params = new URLSearchParams(window.location.search);
    const p = params.get("phone");
    if (p && isValidPhone(p)) setPhone(p);
  }, []);

  // Already authenticated (e.g. Telegram Mini App silent login) → no OTP needed.
  // Only fires on the untouched login step, never mid password-reset flow.
  useEffect(() => {
    if (status === "authenticated" && step === "login") {
      const intent = consumeDeferredAction();
      router.replace(intent ? routeForIntent(intent) : "/");
    }
  }, [status, step, router]);

  // ── Login with password ────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: () => loginWithPassword(phone, password),
    onSuccess: (result) => {
      setSession(result);
      const intent = consumeDeferredAction();
      router.replace(intent ? routeForIntent(intent) : "/");
    },
    onError: (e) => setServerError(fe(extractError(e))),
  });

  // ── Forgot password: send the ONE OTP over WhatsApp, go straight to reset ──
  // The reset screen collects that same code + the new password and submits them
  // to /auth/phone/reset-password. One send per flow → never hits the 1/min cap.
  const sendOtpMutation = useMutation({
    mutationFn: () => sendOtp(phone),
    onSuccess: () => {
      setServerError(null);
      setResendSeconds(60);
      setResetOtp("");
      setResetPhase("code");
      setStep("reset");
    },
    onError: (e) => setServerError(fe(extractError(e))),
  });

  // Send the reset code (used by the phone-only "forgot" step and the ?reset=1
  // deep-link). The login step never sends directly — it switches to "forgot".
  const sendResetCode = () => {
    if (!isValidPhone(phone)) {
      setServerError(tl("enter_phone_first"));
      return;
    }
    setServerError(null);
    sendOtpMutation.mutate();
  };

  // ── Reset password, then log in with it ─────────────────────────────────
  // reset-password returns 204 (no session) and revokes all existing sessions,
  // so we immediately log in with the just-set password to grant a fresh one.
  // Both steps live in the mutationFn so a failure in either surfaces via onError.
  const resetMutation = useMutation({
    mutationFn: async () => {
      await resetPassword(phone, resetOtp, newPassword);
      return loginWithPassword(phone, newPassword);
    },
    onSuccess: (result) => {
      setSession(result);
      const intent = consumeDeferredAction();
      router.replace(intent ? routeForIntent(intent) : "/");
    },
    onError: (e) => setServerError(fe(extractError(e))),
  });

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-white dark:bg-ink-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pb-2 pt-6">
        <button
          type="button"
          onClick={() => {
            setServerError(null);
            if (step === "forgot") setStep("login");
            else if (step === "reset") {
              // Within reset: password → back to code; code → back to forgot.
              if (resetPhase === "password") setResetPhase("code");
              else setStep("forgot");
            }
            else router.back();
          }}
          aria-label={tl("back_btn")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="text-[16px] font-900 text-ink-900 dark:text-white">
          {step === "login" ? tl("login_btn") : tl("forgot_title")}
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center px-6 pb-10">
        <div className="mb-7 text-center">
          <AuthLogo />
          <h1><Wordmark className="text-[20px]" /></h1>
          <p className="mt-1 text-[15px] font-700 text-ink-400">
            {step === "login" ? tl("password_label") : step === "forgot" ? tl("forgot_hint") : ""}
          </p>
        </div>

        {/* Error banner */}
        {serverError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-coral-50 px-4 py-3 dark:bg-coral-500/10">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" aria-hidden />
            <p className="text-[14px] font-800 text-coral-600">{serverError}</p>
          </div>
        )}

        {/* ── Step: main login ── */}
        {step === "login" && (
          <>
            {/* Phone */}
            <div className="mb-3">
              <PhoneInput
                value={phone}
                onValueChange={(v) => { setPhone(v); setServerError(null); }}
                invalid={false}
                placeholder="000 000 000"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValidPhone(phone)) passwordRef.current?.focus();
                }}
              />
            </div>

            {/* Password */}
            <div className="mb-5">
              <div className="relative">
                <input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setServerError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && canSubmitLogin) loginMutation.mutate(); }}
                  placeholder={tl("password_placeholder")}
                  className={cn(
                    "h-12 w-full rounded-2xl border-2 bg-ink-50 px-4 pr-10 text-[16px] font-800 outline-none transition-colors dark:bg-ink-800 dark:text-white",
                    serverError
                      ? "border-coral-300 text-coral-700"
                      : "border-ink-200 text-ink-900 focus:border-brand-500 dark:border-ink-700",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  tabIndex={-1}
                  aria-label={showPassword ? tl("password_hide") : tl("password_show")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="button"
              disabled={!canSubmitLogin || loginMutation.isPending}
              onClick={() => loginMutation.mutate()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 text-[16px] font-900 text-accent-ink shadow-cta transition-colors hover:bg-accent-400 disabled:opacity-40"
            >
              {loginMutation.isPending ? <><Spinner size={16} />{tl("logging_in")}</> : tl("login_btn")}
            </button>

            {/* Forgot + Register */}
            <div className="mt-5 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => { setServerError(null); setStep("forgot"); }}
                className="text-[15px] font-800 text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
              >
                {tl("forgot_password")}
              </button>
              <p className="text-[14px] font-700 text-ink-400">
                {tl("no_account")}{" "}
                <Link href="/auth/register" className="font-900 text-brand-700 dark:text-brand-300">
                  {tl("register_link")}
                </Link>
              </p>
            </div>
          </>
        )}

        {/* ── Step: forgot password (phone only, password hidden) ── */}
        {step === "forgot" && (
          <>
            <div className="mb-5">
              <PhoneInput
                value={phone}
                onValueChange={(v) => { setPhone(v); setServerError(null); }}
                invalid={false}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && isValidPhone(phone)) sendResetCode(); }}
              />
            </div>

            <button
              type="button"
              disabled={!isValidPhone(phone) || sendOtpMutation.isPending || resendSeconds > 0}
              onClick={sendResetCode}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 text-[16px] font-900 text-accent-ink shadow-cta transition-colors hover:bg-accent-400 disabled:opacity-40"
            >
              {sendOtpMutation.isPending
                ? <><Spinner size={16} />{tl("sending")}</>
                : resendSeconds > 0
                  ? tl("resend_in", { n: resendSeconds })
                  : tl("get_code_btn")}
            </button>

            <button
              type="button"
              onClick={() => { setServerError(null); setStep("login"); }}
              className="mt-5 w-full text-center text-[14px] font-800 text-ink-400 hover:text-ink-700"
            >
              {tl("back_btn")}
            </button>
          </>
        )}

        {/* ── Step: new password ── */}
        {step === "reset" && (
          <ResetStep
            tl={tl}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            resetOtp={resetOtp}
            setResetOtp={setResetOtp}
            serverError={serverError}
            setServerError={setServerError}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            newPasswordRef={newPasswordRef}
            canReset={canReset}
            resetMutation={resetMutation}
            phase={resetPhase}
            canContinue={resetOtp.length === 6}
            onContinue={() => {
              setServerError(null);
              setResetPhase("password");
              setTimeout(() => newPasswordRef.current?.focus(), 100);
            }}
          />
        )}
      </div>
    </div>
  );
}
