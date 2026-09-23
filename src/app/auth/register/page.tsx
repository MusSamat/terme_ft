"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, Eye, EyeOff, AlertTriangle, MessageCircle } from "lucide-react";
import { checkPhone, register, sendOtp } from "@/lib/api/auth";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { consumeDeferredAction, routeForIntent } from "@/lib/auth/deferred-action";
import { useAuth } from "@/store/auth";
import {
  LogoMark,
  Wordmark,
  PhoneInput,
  OtpInput,
  Checkbox,
  Spinner,
  type OtpInputHandle,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { isValidPhone, formatPhoneDisplay } from "@/lib/phone";

type Step = "phone" | "otp" | "details";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const fe = useFriendlyError();
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const status = useAuth((s) => s.status);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const otpRef = useRef<OtpInputHandle>(null);

  const displayPhone = formatPhoneDisplay(phone);
  // Mirror the backend RegisterBody contract: password ≥8 AND contains a digit,
  // and the OTP is a full 6 digits — otherwise the button submits an invalid
  // payload that only fails at the backend.
  const canSubmit =
    name.trim().length > 0 &&
    surname.trim().length > 0 &&
    password.length >= 8 &&
    /\d/.test(password) &&
    otp.length === 6 &&
    terms;

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  useEffect(() => {
    if (status === "authenticated" && step === "phone") {
      const intent = consumeDeferredAction();
      router.replace(intent ? routeForIntent(intent) : "/");
    }
  }, [status, step, router]);

  const goHome = () => {
    const intent = consumeDeferredAction();
    router.replace(intent ? routeForIntent(intent) : "/");
  };

  // ── Step 1: check the number is free, then send the WhatsApp OTP ────────
  const startMutation = useMutation({
    mutationFn: async () => {
      const info = await checkPhone(phone);
      if (info.exists) return { taken: true as const };
      await sendOtp(phone);
      return { taken: false as const };
    },
    onSuccess: (r) => {
      if (r.taken) {
        setExisting(true);
        return;
      }
      setServerError(null);
      setResendSeconds(60);
      setOtp("");
      otpRef.current?.clear();
      setStep("otp");
      setTimeout(() => otpRef.current?.focus(), 100);
    },
    onError: (e) => setServerError(fe(extractError(e))),
  });

  // Resend on the OTP step (no re-check needed — we already know it's free).
  const resendMutation = useMutation({
    mutationFn: () => sendOtp(phone),
    onSuccess: () => { setServerError(null); setResendSeconds(60); },
    onError: (e) => setServerError(fe(extractError(e))),
  });

  // ── Final: create the account ───────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: () =>
      register({ phone, code: otp, name: name.trim(), surname: surname.trim(), password }),
    onSuccess: (result) => {
      setSession(result);
      goHome();
    },
    onError: (e) => {
      const err = extractError(e);
      setServerError(fe(err));
      // Wrong / expired / exhausted OTP → send the user back to the code step to
      // re-enter it, instead of stranding a code error on the details screen.
      if (err.code === "OTP_WRONG" || err.code === "OTP_EXPIRED" || err.code === "OTP_TOO_MANY_ATTEMPTS") {
        setOtp("");
        setStep("otp");
        setTimeout(() => {
          otpRef.current?.clear();
          otpRef.current?.focus();
        }, 100);
      }
    },
  });

  const handleStart = () => {
    if (!isValidPhone(phone)) {
      setServerError(t("err_phone_invalid"));
      return;
    }
    setServerError(null);
    startMutation.mutate();
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-white dark:bg-ink-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pb-2 pt-6">
        <button
          type="button"
          onClick={() => {
            if (step === "details") setStep("otp");
            else if (step === "otp") setStep("phone");
            else router.back();
          }}
          aria-label={t("back_btn")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="text-[16px] font-900 text-ink-900 dark:text-white">{t("title")}</span>
      </div>

      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center px-6 pb-10">
        <div className="mb-7 text-center">
          <LogoMark className="mx-auto mb-4 h-16 w-16 rounded-3xl shadow-brandcta" />
          <h1><Wordmark className="text-[20px]" /></h1>
          <p className="mt-1 text-[15px] font-700 text-ink-400">
            {step === "phone" ? t("phone_hint") : step === "otp" ? t("code_hint") : t("details_hint")}
          </p>
        </div>

        {serverError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-coral-50 px-4 py-3 dark:bg-coral-500/10">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" aria-hidden />
            <p className="text-[14px] font-800 text-coral-600">{serverError}</p>
          </div>
        )}

        {/* ── Step 1: phone ── */}
        {step === "phone" && (
          <>
            {existing ? (
              <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-5 text-center dark:border-brand-500/30 dark:bg-brand-500/10">
                <p className="text-[16px] font-900 text-ink-900 dark:text-white">{t("already_registered_title")}</p>
                <p className="mt-1 text-[14px] font-600 text-ink-500">{t("already_registered_desc")}</p>
                <Link
                  href={`/auth/login?phone=${encodeURIComponent(phone)}&reset=1`}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-accent-500 text-[15px] font-900 text-accent-ink shadow-cta hover:bg-accent-400"
                >
                  {t("restore_password")}
                </Link>
                <Link
                  href={`/auth/login?phone=${encodeURIComponent(phone)}`}
                  className="mt-3 inline-block text-[14px] font-800 text-brand-700 dark:text-brand-300"
                >
                  {t("sign_in")}
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <PhoneInput
                    value={phone}
                    onValueChange={(v) => { setPhone(v); setServerError(null); }}
                    invalid={false}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && isValidPhone(phone)) handleStart(); }}
                  />
                </div>

                {/* Primary CTA = brand Amber (consistent across auth). The
                    WhatsApp delivery channel is signalled by the green hint below. */}
                <button
                  type="button"
                  disabled={!isValidPhone(phone) || startMutation.isPending}
                  onClick={handleStart}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 text-[16px] font-900 text-accent-ink shadow-cta transition-colors hover:bg-accent-400 disabled:opacity-40"
                >
                  {startMutation.isPending
                    ? <><Spinner size={16} />{t("sending")}</>
                    : <><MessageCircle className="h-4 w-4" />{t("send_code_btn")}</>}
                </button>

                <p className="mt-5 text-center text-[14px] font-700 text-ink-400">
                  {t("have_account")}{" "}
                  <Link href="/auth/login" className="font-900 text-brand-700 dark:text-brand-300">
                    {t("sign_in")}
                  </Link>
                </p>
              </>
            )}
          </>
        )}

        {/* ── Step 2: OTP code only ── */}
        {step === "otp" && (
          <>
            <p className="mb-2 flex items-center justify-center gap-1.5 text-center text-[15px] font-700 text-[#128C7E]">
              <MessageCircle className="h-4 w-4" />
              {t("otp_dm_hint")}
            </p>
            <p className="mb-5 text-center text-[16px] font-800 text-ink-900 dark:text-white">
              {displayPhone}
            </p>

            <div className="mb-4 flex justify-center">
              <OtpInput
                ref={otpRef}
                length={6}
                onChange={(code) => { setOtp(code); setServerError(null); }}
                onComplete={() => setStep("details")}
                invalid={!!serverError}
              />
            </div>

            {/* Resend — throttled to one code / minute. */}
            <div className="mb-6 text-center">
              {resendSeconds > 0 ? (
                <p className="text-[13px] text-ink-400">{t("resend_in", { n: resendSeconds })}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                  className="text-[14px] font-700 text-brand-600 hover:text-brand-700 dark:text-brand-300"
                >
                  {resendMutation.isPending ? t("sending") : t("resend_btn")}
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={otp.length !== 6}
              onClick={() => setStep("details")}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-accent-500 text-[16px] font-900 text-accent-ink shadow-cta transition-colors hover:bg-accent-400 disabled:opacity-40"
            >
              {t("continue_btn")}
            </button>
          </>
        )}

        {/* ── Step 3: profile + password (separate page) ── */}
        {step === "details" && (
          <>
            <LabeledField label={t("name_label")}>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setServerError(null); }}
                autoComplete="given-name"
                autoFocus
                className="h-12 w-full rounded-2xl border-2 border-ink-200 bg-ink-50 px-4 text-[16px] font-800 text-ink-900 outline-none transition-colors focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              />
            </LabeledField>

            <LabeledField label={t("surname_label")}>
              <input
                type="text"
                value={surname}
                onChange={(e) => { setSurname(e.target.value); setServerError(null); }}
                autoComplete="family-name"
                className="h-12 w-full rounded-2xl border-2 border-ink-200 bg-ink-50 px-4 text-[16px] font-800 text-ink-900 outline-none transition-colors focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              />
            </LabeledField>

            <LabeledField label={t("password_label")}>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setServerError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) registerMutation.mutate(); }}
                  autoComplete="new-password"
                  className="h-12 w-full rounded-2xl border-2 border-ink-200 bg-ink-50 px-4 pr-10 text-[16px] font-800 text-ink-900 outline-none transition-colors focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  tabIndex={-1}
                  aria-label={showPassword ? t("password_hide") : t("password_show")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className={cn("mt-1.5 text-[12px] font-600", password.length > 0 && password.length < 8 ? "text-coral-500" : "text-ink-400")}>
                {t("password_rule")}
              </p>
            </LabeledField>

            {/* Terms + privacy — must be accepted to enable account creation. */}
            <label className="mb-4 flex items-start gap-2.5">
              <Checkbox id="terms" checked={terms} onCheckedChange={(v) => setTerms(v === true)} />
              <span className="text-[13px] font-600 leading-snug text-ink-600 dark:text-ink-300">
                {t("terms_prefix")}{" "}
                <Link href="/terms" target="_blank" className="font-800 text-brand-700 hover:text-brand-800 dark:text-brand-300">
                  {t("terms_link")}
                </Link>{" "}
                {t("terms_and")}{" "}
                <Link href="/privacy" target="_blank" className="font-800 text-brand-700 hover:text-brand-800 dark:text-brand-300">
                  {t("privacy_link")}
                </Link>
              </span>
            </label>

            <button
              type="button"
              disabled={!canSubmit || registerMutation.isPending}
              onClick={() => registerMutation.mutate()}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 text-[16px] font-900 text-accent-ink shadow-cta transition-colors hover:bg-accent-400 disabled:opacity-40"
            >
              {registerMutation.isPending ? <><Spinner size={16} />{t("creating")}</> : t("create_btn")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[12px] font-800 uppercase tracking-wide text-ink-400">{label}</label>
      {children}
    </div>
  );
}
