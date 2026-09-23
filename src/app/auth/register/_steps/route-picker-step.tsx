"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const POPULAR_ROUTES = [
  { from: "Бишкек", to: "Ош" },
  { from: "Бишкек", to: "Каракол" },
  { from: "Бишкек", to: "Нарын" },
  { from: "Бишкек", to: "Баткен" },
];

export function RoutePickerStep() {
  const t = useTranslations("auth.register");
  const router = useRouter();

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-[28px]">
          🗺️
        </div>
        <h2 className="text-[20px] font-800 text-ink-900 dark:text-white">{t("routes_title")}</h2>
        <p className="mt-1.5 text-[15px] text-ink-500">{t("routes_subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {POPULAR_ROUTES.map(({ from, to }) => (
          <button
            key={`${from}-${to}`}
            type="button"
            onClick={() => {
              localStorage.setItem("terme_onboarding_done", "1");
              router.replace(`/trips?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
            }}
            className="flex flex-col items-start rounded-2xl border-2 border-ink-200 bg-white p-4 text-left transition-all hover:border-brand-400 hover:shadow-sm active:scale-[0.97] dark:bg-ink-900 dark:border-ink-700"
          >
            <span className="text-[16px] font-800 text-ink-900 dark:text-white">{from}</span>
            <span className="mt-0.5 text-[13px] font-700 uppercase tracking-widest text-ink-400">↓</span>
            <span className="text-[16px] font-800 text-brand-700">{to}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("terme_onboarding_done", "1");
          router.replace("/");
        }}
        className="text-center text-[15px] font-700 text-ink-400 hover:text-brand-700"
      >
        {t("other_route")}
      </button>
    </div>
  );
}
