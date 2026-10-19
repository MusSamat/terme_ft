"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
// global-error replaces the root layout — it must load the styles itself.
import "./globals.css";

type Locale = "ru" | "kg";

const MSGS: Record<Locale, { title: string; desc: string; retry: string; code: string }> = {
  ru: {
    title: "Что-то пошло не так",
    desc: "Произошла непредвиденная ошибка. Попробуйте обновить страницу.",
    retry: "Попробовать снова",
    code: "Код: ",
  },
  kg: {
    title: "Бир нерсе туура эмес болду",
    desc: "Күтүлбөгөн ката кетти. Баракчаны жаңыртып көрүңүз.",
    retry: "Кайра аракет кылуу",
    code: "Код: ",
  },
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>("ru");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)terme_locale=([^;]+)/);
    if (m?.[1] === "kg") setLocale("kg");
  }, []);

  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  const msg = MSGS[locale];

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-5 py-12 text-center font-sans dark:bg-ink-950">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-danger-100 text-danger-600">
          <AlertTriangle className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="font-disp text-[22px] font-900 text-ink-900 dark:text-white">{msg.title}</h1>
        <p className="mt-2 max-w-sm text-[15px] font-600 text-ink-500">{msg.desc}</p>
        {error.digest && (
          <p className="mt-1 font-mono text-[12px] text-ink-400">{msg.code}{error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-brand-600 px-6 text-[15px] font-900 text-white shadow-brandcta transition-colors hover:bg-brand-700"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {msg.retry}
        </button>
      </body>
    </html>
  );
}
