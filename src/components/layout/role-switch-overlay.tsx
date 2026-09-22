"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils/cn";

// Full-screen role-switch loader (web twin of the Flutter RoleSwitchOverlay).
// When the active role flips Пассажир ⇄ Водитель it plays for ~1.5s: the
// role illustration (tinted via CSS mask) springs in, the role name +
// explanatory line, and a spinner in the role colour.
export function RoleSwitchOverlay() {
  const t = useTranslations("feed");
  const mode = useAuth((s) => s.activeMode);
  const prev = useRef(mode);
  const [show, setShow] = useState(false);
  const [driver, setDriver] = useState(false);

  useEffect(() => {
    if (prev.current === mode) return;
    prev.current = mode;
    setDriver(mode === "driver");
    setShow(true);
    const id = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(id);
  }, [mode]);

  if (!show) return null;

  const img = `url(/role-${driver ? "driver" : "passenger"}.png)`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-50 dark:bg-ink-950">
      <div className="flex animate-card-in flex-col items-center px-8 text-center">
        <div
          className={cn(
            "flex h-32 w-32 items-center justify-center rounded-full",
            driver ? "bg-grape-600/10" : "bg-brand-600/10",
          )}
        >
          <span
            className={cn("h-16 w-16", driver ? "bg-grape-600" : "bg-brand-600")}
            style={{
              maskImage: img,
              WebkitMaskImage: img,
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
            aria-hidden="true"
          />
        </div>
        <h2 className="mt-6 text-[22px] font-900 text-ink-900 dark:text-white">
          {driver ? t("role_switch_driver") : t("role_switch_passenger")}
        </h2>
        <p className="mt-2 max-w-[280px] text-[14px] font-600 leading-relaxed text-ink-500 dark:text-ink-400">
          {driver ? t("role_switch_driver_sub") : t("role_switch_passenger_sub")}
        </p>
        <div
          className={cn(
            "mt-6 h-6 w-6 animate-spin rounded-full border-[2.5px] border-ink-200 dark:border-ink-800",
            driver ? "border-t-grape-600" : "border-t-brand-600",
          )}
        />
      </div>
    </div>
  );
}
