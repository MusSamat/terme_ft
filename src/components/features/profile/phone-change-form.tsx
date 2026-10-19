"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { changePhone, confirmPhoneChange } from "@/lib/api/profile";
import { useAuth } from "@/store/auth";
import { toastSuccess } from "@/components/layout/quick-toast";
import { Button, Label, OtpInput, PhoneInput, Spinner } from "@/components/ui";
import type { OtpInputHandle } from "@/components/ui/otp-input";
import { useCountdown } from "@/lib/hooks/use-countdown";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";

type Step = "idle" | "otp";

export function PhoneChangeForm() {
  const t = useTranslations("profile_forms");
  const tToasts = useTranslations("toasts");
  const fe = useFriendlyError();
  const updateUser = useAuth((s) => s.updateUser);
  const [step, setStep] = useState<Step>("idle");
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const otpRef = useRef<OtpInputHandle>(null);
  const { remaining, reset: startCountdown } = useCountdown(0);
  const counting = remaining > 0;

  const sendMutation = useMutation({
    mutationFn: () => changePhone(newPhone),
    onSuccess: () => {
      setStep("otp");
      startCountdown(60);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmPhoneChange(newPhone, otp),
    onSuccess: (updated) => {
      updateUser({ phone: updated.phone });
      toastSuccess(tToasts("phone_updated"));
      setStep("idle");
      setNewPhone("");
      setOtp("");
    },
    onError: () => {
      otpRef.current?.clear();
      setOtp("");
    },
  });

  if (step === "otp") {
    return (
      <div className="space-y-4">
        <p className="text-body-lg text-ink-700 dark:text-ink-300">
          {t("otp_sent_to")}{" "}
          <span className="font-semibold text-ink-900 dark:text-white">{newPhone}</span>
        </p>
        <div>
          <Label>{t("otp_label")}</Label>
          <OtpInput
            ref={otpRef}
            length={6}
            onChange={setOtp}
            className="mt-2"
          />
        </div>
        {/* Real reason: wrong / expired code, too many attempts, number taken… */}
        {(confirmMutation.error || sendMutation.error) && (
          <p className="text-caption text-coral-500">
            {fe(extractError(confirmMutation.error ?? sendMutation.error))}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            disabled={otp.length !== 6 || confirmMutation.isPending}
            onClick={() => confirmMutation.mutate()}
          >
            {confirmMutation.isPending ? <Spinner size={16} /> : t("confirm")}
          </Button>
          <Button
            variant="ghost"
            size="md"
            disabled={counting}
            onClick={() => sendMutation.mutate()}
          >
            {counting ? t("resend_in", { seconds: remaining }) : t("resend")}
          </Button>
        </div>
        <button
          type="button"
          className="text-caption text-ink-500 underline"
          onClick={() => setStep("idle")}
        >
          {t("change_number")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("new_phone_label")}</Label>
        <PhoneInput value={newPhone} onValueChange={setNewPhone} className="mt-1" />
      </div>
      <p className="text-[13px] font-600 text-ink-500">{t("whatsapp_note")}</p>
      {sendMutation.error && (
        <p className="text-caption text-coral-500">{fe(extractError(sendMutation.error))}</p>
      )}
      <Button
        variant="primary"
        size="md"
        disabled={newPhone.length < 10 || sendMutation.isPending}
        onClick={() => sendMutation.mutate()}
      >
        {sendMutation.isPending ? <Spinner size={16} /> : t("get_code")}
      </Button>
    </div>
  );
}
