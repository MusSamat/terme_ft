"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme, type Theme } from "@/components/theme-provider";
import { cn } from "@/lib/utils/cn";

// Cycle order: Авто (device) → Светлая → Тёмная → Авто. Default stays «Авто».
const ORDER: Theme[] = ["system", "light", "dark"];

/** Round icon button cycling Авто → Светлая → Тёмная. The icon shows the
 *  CURRENT mode, so «Авто» (follow device) is reachable, not just light/dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  // Avoid hydration mismatch: assume «system» until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current: Theme = mounted ? theme : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;

  const Icon = current === "system" ? Monitor : current === "dark" ? Moon : Sun;
  const label = current === "system" ? t("system") : current === "dark" ? t("dark") : t("light");

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(next)}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
