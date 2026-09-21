"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Phone, Shield, MessageCircle } from "lucide-react";
import { sendOtp, confirmPhoneAdd, confirmPhoneFromTelegram } from "@/lib/api/auth";
import { detectRuntime } from "@/lib/detect-runtime";
import { useAuth } from "@/store/auth";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { isValidPhone, formatPhoneDisplay } from "@/lib/phone";
import { Button, PhoneInput, Spinner } from "@/components/ui";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";

type Step = "phone" | "otp";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}

/**
 * Collect + verify a real phone for the current user.
 *  - Inside Telegram: one-tap «Поделиться контактом» (Telegram returns the
 *    account's verified number, no code). If the user hides/declines it, the
 *    manual path below still works — enter a number, get a WhatsApp code.
 *  - Web: manual number + WhatsApp code.
 * Every code goes through WhatsApp (backend deliverOtp).
 */
export function AddPhoneModal({ open, onClose, onDone }: Props) {
  const t = useTranslations("auth.add_phone");
  const fe = useFriendlyError();
  const setSession = useAuth((s) => s.setSession);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setStep("phone");
      setPhone("");
      setOtp("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const isTma = detectRuntime() === "telegram";
  const canRequestContact =
    isTma &&
    typeof window !== "undefined" &&
    typeof window.Telegram?.WebApp?.requestContact === "function";

  // Telegram one-tap share: the account's verified number as a signed payload.
  const handleShareContact = () => {
    setError(null);
    setLoading(true);
    window.Telegram!.WebApp!.requestContact!((ok, event) => {
      void (async () => {
        try {
          if (!ok || !event?.response) {
            // Declined / hidden number → keep the modal open; the manual field
            // below lets them proceed with a WhatsApp code instead.
            setError(t("share_declined"));
            return;
          }
          const result = await confirmPhoneFromTelegram(event.response);
          setSession(result);
          onDone?.();
          onClose();
        } catch (e) {
          setError(fe(extractError(e)));
        } finally {
          setLoading(false);
        }
      })();
    });
  };

  // Manual path: send a WhatsApp OTP to the typed number.
  const handlePhoneSubmit = async () => {
    if (!isValidPhone(phone)) return;
    setLoading(true);
    setError(null);
    try {
      await sendOtp(phone);
      setStep("otp");
    } catch (e) {
      setError(fe(extractError(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      const result = await confirmPhoneAdd(phone, otp);
      setSession(result);
      onDone?.();
      onClose();
    } catch (e) {
      setError(fe(extractError(e)));
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const title = step === "otp" ? t("title_otp") : t("title_phone");

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              {step === "otp" ? <Shield className="h-5 w-5" aria-hidden /> : <Phone className="h-5 w-5" aria-hidden />}
            </div>
            <ModalTitle className="font-disp">{title}</ModalTitle>
          </div>
        </ModalHeader>

        {error && (
          <div className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-[15px] font-700 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400">
            {error}
          </div>
        )}

        {step === "phone" && (
          <div className="space-y-4">
            {isTma && (
              <>
                <p className="text-[15px] font-700 text-ink-500 dark:text-ink-400">{t("share_tg_body")}</p>
                {canRequestContact ? (
                  <Button variant="cta" size="lg" className="w-full" disabled={loading} onClick={handleShareContact}>
                    {loading ? <Spinner size={16} /> : t("share_tg_btn")}
                  </Button>
                ) : (
                  <p className="rounded-xl bg-accent-50 px-3 py-2.5 text-[14px] font-700 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
                    {t("update_telegram")}
                  </p>
                )}
                <div className="flex items-center gap-3 py-0.5">
                  <div className="h-px flex-1 bg-ink-200 dark:bg-ink-700" />
                  <span className="text-[13px] font-700 text-ink-400">{t("share_tg_or")}</span>
                  <div className="h-px flex-1 bg-ink-200 dark:bg-ink-700" />
                </div>
              </>
            )}

            <p className="flex items-center justify-center gap-1.5 text-center text-[14px] font-700 text-[#128C7E]">
              <MessageCircle className="h-4 w-4" />
              {t("manual_hint")}
            </p>
            <PhoneInput value={phone} onValueChange={setPhone} autoFocus={!isTma} />
            <Button
              variant="brand"
              size="lg"
              className="w-full"
              disabled={!isValidPhone(phone) || loading}
              onClick={handlePhoneSubmit}
            >
              {loading ? <Spinner size={16} /> : t("get_code")}
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-[15px] font-700 text-ink-500 dark:text-ink-400">
              {t("otp_sent_to")}{" "}
              <span className="font-800 text-ink-900 dark:text-white">{formatPhoneDisplay(phone)}</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              autoFocus
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handleOtpSubmit()}
              placeholder="— — — — — —"
              className="w-full rounded-2xl border-2 border-ink-200 bg-ink-50 px-4 py-3 text-center text-[22px] font-900 tracking-[0.3em] text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
            />
            <Button variant="cta" size="lg" className="w-full" disabled={otp.length < 6 || loading} onClick={handleOtpSubmit}>
              {loading ? <Spinner size={16} /> : t("confirm")}
            </Button>
            <button
              type="button"
              onClick={() => { setStep("phone"); setOtp(""); setError(null); }}
              className="w-full text-center text-[15px] font-700 text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200"
            >
              {t("change_number")}
            </button>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
