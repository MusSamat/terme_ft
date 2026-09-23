"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight, X } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useRolePrompt, markRoleChosen } from "@/store/role-prompt";
import { cn } from "@/lib/utils/cn";

type Role = "passenger" | "driver";

// Role illustration (same art as the role-switch loader / intent toggle),
// tinted to the role colour via CSS mask so it works in light + dark.
function RoleArt({ driver }: { driver: boolean }) {
  const img = `url(/role-${driver ? "driver" : "passenger"}.png)`;
  return (
    <span
      aria-hidden="true"
      className={cn("h-11 w-11", driver ? "bg-grape-600" : "bg-brand-600")}
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
    />
  );
}

export function RoleSelectModal() {
  const t = useTranslations("role_prompt");
  const router = useRouter();
  const open = useRolePrompt((s) => s.open);
  const mode = useRolePrompt((s) => s.mode);
  const close = useRolePrompt((s) => s.close);
  const setActiveMode = useAuth((s) => s.setActiveMode);

  // Lock body scroll while the sheet is up.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Esc closes (dismiss = accept default in gate mode).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isCreate = mode === "create";

  // Dismiss without choosing: on the one-time gate, closing accepts the current
  // default (passenger) and stops the gate nagging; on create it just cancels.
  const dismiss = () => {
    if (mode === "gate") markRoleChosen();
    close();
  };

  const pick = (role: Role) => {
    setActiveMode(role); // choice A — the pick always updates the active mode
    if (isCreate) {
      close();
      router.push(role === "driver" ? "/trips/create" : "/requests/create");
    } else {
      markRoleChosen();
      close();
    }
  };

  const cards: { role: Role; heading: string; desc: string }[] = [
    {
      role: "passenger",
      heading: isCreate ? t("create_passenger") : t("passenger"),
      desc: isCreate ? t("create_passenger_desc") : t("gate_passenger_desc"),
    },
    {
      role: "driver",
      heading: isCreate ? t("create_driver") : t("driver"),
      desc: isCreate ? t("create_driver_desc") : t("gate_driver_desc"),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={isCreate ? t("create_title") : t("gate_title")}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} aria-hidden="true" />

      <div
        className="relative z-10 w-full max-w-[440px] animate-card-in rounded-t-4xl bg-white p-5 shadow-lift dark:bg-ink-900 sm:rounded-4xl"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("close")}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-500 transition-colors hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="pr-10">
          <h2 className="text-[20px] font-900 text-ink-900 dark:text-white">
            {isCreate ? t("create_title") : t("gate_title")}
          </h2>
          <p className="mt-1 text-[14px] font-600 text-ink-500 dark:text-ink-400">
            {isCreate ? t("create_sub") : t("gate_sub")}
          </p>
        </div>

        <div className="mt-4 space-y-2.5">
          {cards.map(({ role, heading, desc }) => {
            const driver = role === "driver";
            return (
              <button
                key={role}
                type="button"
                onClick={() => pick(role)}
                className={cn(
                  "flex w-full items-center gap-3.5 rounded-3xl border-2 p-3 text-left transition-all active:scale-[0.98]",
                  driver
                    ? "border-grape-200 hover:border-grape-400 hover:bg-grape-50 dark:border-grape-500/30 dark:hover:bg-grape-500/10"
                    : "border-brand-200 hover:border-brand-400 hover:bg-brand-50 dark:border-brand-500/30 dark:hover:bg-brand-500/10",
                )}
              >
                <span
                  className={cn(
                    "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl",
                    driver ? "bg-grape-600/10" : "bg-brand-600/10",
                  )}
                >
                  <RoleArt driver={driver} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[17px] font-900",
                      driver ? "text-grape-700 dark:text-grape-300" : "text-brand-700 dark:text-brand-300",
                    )}
                  >
                    {heading}
                  </span>
                  <span className="mt-0.5 block text-[13.5px] font-600 leading-snug text-ink-500 dark:text-ink-400">
                    {desc}
                  </span>
                </span>
                <ChevronRight
                  className={cn("h-5 w-5 shrink-0", driver ? "text-grape-400" : "text-brand-400")}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
