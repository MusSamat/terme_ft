"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  getTelegramLinkStatus,
  initTelegramLink,
  sendTelegramOtp,
  verifyOtp,
} from "@/lib/api/auth";
import { otpSchema } from "@/lib/validation/auth";
import { openTelegramDeepLink } from "@/lib/utils/open-telegram";
import { Button, OtpInput, Spinner, type OtpInputHandle } from "@/components/ui";
import type { AuthResult } from "@/lib/api/types";

interface Props {
  phone: string;
  onVerified: (result: AuthResult) => void;
  onBack: () => void;
  onError: (e: unknown) => void;
}

type Channel = "dm" | "deeplink";
type SendResult =
  | { channel: "dm" }
  | { channel: "deeplink"; token: string; deepLink: string };

export function TelegramStep({ phone, onVerified, onBack, onError }: Props) {
  const t = useTranslations("auth.register");
  const otpRef = useRef<OtpInputHandle>(null);
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(60);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [token, setToken] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const started = useRef(false);

  // Poll the link status only in deep-link mode — catches an expired link while
  // the user is over in the bot pressing "Start".
  const statusQuery = useQuery({
    queryKey: ["telegram-link-status", token],
    queryFn: () => getTelegramLinkStatus(token),
    enabled: channel === "deeplink" && token.length > 0,
    refetchInterval: (q) => (q.state.data?.status === "waiting" ? 2000 : false),
  });

  useEffect(() => {
    if (statusQuery.data?.status === "expired") onError(new Error("TELEGRAM_LINK_EXPIRED"));
  }, [statusQuery.data?.status, onError]);

  useEffect(() => {
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  // DM-first delivery: a phone that already has a linked Telegram gets the code
  // straight as a direct message (zero clicks, no "Start"). A first-time / unlinked
  // phone falls back to the deep-link so the user presses "Start" once in the bot.
  const sendMutation = useMutation({
    mutationFn: async (): Promise<SendResult> => {
      try {
        await sendTelegramOtp(phone);
        return { channel: "dm" };
      } catch {
        const link = await initTelegramLink(phone);
        return { channel: "deeplink", token: link.token, deepLink: link.deepLink };
      }
    },
    onSuccess: (res) => {
      setChannel(res.channel);
      setResendIn(60);
      if (res.channel === "deeplink") {
        setToken(res.token);
        setDeepLink(res.deepLink);
        // Opening the deep-link triggers the bot's /start → auto-sends the OTP.
        // We're past an await here (no user-gesture context), so window.open
        // would be popup-blocked on mobile — openTelegramDeepLink handles it.
        openTelegramDeepLink(res.deepLink);
      }
    },
    onError,
  });

  // Auto-request the code on step entry — no manual "get code" click.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    sendMutation.mutate();
  }, [sendMutation]);

  const handleResend = () => {
    if (resendIn > 0) return;
    if (channel === "deeplink" && deepLink) {
      // Re-open the deep-link → bot re-sends the code.
      openTelegramDeepLink(deepLink);
      statusQuery.refetch();
      setResendIn(60);
    } else {
      sendMutation.mutate();
    }
  };

  const verifyMutation = useMutation({
    mutationFn: (c: string) => verifyOtp(phone, c),
    onSuccess: onVerified,
    onError: (e) => { otpRef.current?.clear(); onError(e); },
  });

  const isDeepLink = channel === "deeplink";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = otpSchema.safeParse(code);
        if (!parsed.success) return;
        verifyMutation.mutate(code);
      }}
      className="flex flex-col gap-5 text-center"
      noValidate
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
        <span className="text-[34px] leading-none">✈️</span>
      </div>

      <div>
        <p className="text-[20px] font-900 text-ink-900 dark:text-white">
          {channel === null
            ? t("sending")
            : isDeepLink
              ? t("telegram_start_title")
              : t("telegram_title")}
        </p>
        <p className="mt-1.5 text-[15px] font-700 leading-relaxed text-ink-500">
          {isDeepLink ? t("telegram_start_hint") : t("telegram_hint")}{" "}
          <span className="font-900 text-brand-700">@terme_kg_bot</span>
        </p>
      </div>

      {isDeepLink && deepLink && (
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-900 text-brand-700"
        >
          {t("telegram_open_btn")}
        </a>
      )}

      <OtpInput
        ref={otpRef}
        length={6}
        autoFocus
        invalid={verifyMutation.isError}
        disabled={verifyMutation.isPending}
        onChange={setCode}
        onComplete={(c) => verifyMutation.mutate(c)}
      />

      <Button
        type="submit"
        variant="submit"
        size="lg"
        disabled={verifyMutation.isPending || !otpSchema.safeParse(code).success}
      >
        {verifyMutation.isPending ? <Spinner size={16} /> : t("confirm")}
      </Button>

      {resendIn > 0 ? (
        <p className="text-[14px] font-700 text-ink-400">{t("resend_after", { n: resendIn })}</p>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={sendMutation.isPending}
          className="text-[13px] font-900 text-brand-700"
        >
          {sendMutation.isPending ? t("sending") : t("resend_btn")}
        </button>
      )}

      <button
        type="button"
        onClick={onBack}
        className="text-[15px] font-700 text-ink-400 hover:text-ink-600"
      >
        {t("change")}
      </button>
    </form>
  );
}
