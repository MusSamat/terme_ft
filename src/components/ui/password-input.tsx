"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { invalid?: boolean }
>(({ className, invalid, ...rest }, ref) => {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("auth.register");
  return (
    <div
      className={cn(
        "flex h-12 items-center rounded-2xl bg-ink-50 pl-4 pr-1 transition-shadow focus-within:ring-2 focus-within:ring-brand-500 dark:bg-ink-800",
        invalid && "ring-2 ring-danger-400",
        className,
      )}
    >
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        aria-invalid={invalid || undefined}
        className="w-full border-none bg-transparent p-0 text-body-lg font-bold text-ink-900 outline-none placeholder:font-semibold placeholder:text-ink-400 dark:text-white"
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("password_hide") : t("password_show")}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-700"
      >
        {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
