"use client";

import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { DEFAULT_DIAL, sanitizePhone, formatPhoneDisplay } from "@/lib/phone";

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

export interface PhoneInputProps extends BaseProps {
  value?: string;
  onValueChange?: (full: string) => void;
  invalid?: boolean;
  hint?: string;
}

/**
 * International phone entry, defaulting to +996 (Kyrgyzstan). The whole E.164
 * value is editable — a user can delete +996 and type another country code.
 * For +996 the national part is capped at 9 digits (see lib/phone).
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onValueChange, invalid, hint, className, disabled, ...rest }, ref) => {
    const [e164, setE164] = useState<string>(() => sanitizePhone(value ?? "") || DEFAULT_DIAL);
    const seeded = useRef(false);

    // Seed the caller's state with +996 once when it starts empty, so validation
    // and the displayed prefix agree from the first render.
    useEffect(() => {
      if (!seeded.current && (value === undefined || value === "")) {
        seeded.current = true;
        onValueChange?.(DEFAULT_DIAL);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (value !== undefined && value !== "") setE164(sanitizePhone(value));
    }, [value]);

    const handleChange = (raw: string) => {
      // Keep a leading "+"; if the field is fully cleared, fall back to "+996".
      const next = sanitizePhone(raw) || DEFAULT_DIAL;
      setE164(next);
      onValueChange?.(next);
    };

    return (
      <div className="flex flex-col gap-1.5">
        <div
          className={cn(
            "flex h-12 items-center rounded-2xl bg-ink-50 px-4 transition-shadow focus-within:ring-2 focus-within:ring-brand-500 dark:bg-ink-800",
            invalid && "ring-2 ring-danger-400",
            disabled && "opacity-50",
            className,
          )}
        >
          <input
            ref={ref}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+996 700 123 456"
            value={formatPhoneDisplay(e164)}
            onChange={(e) => handleChange(e.target.value)}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            className="w-full border-none bg-transparent p-0 text-[16px] font-800 text-ink-900 outline-none placeholder:font-500 placeholder:text-ink-300 dark:text-white dark:placeholder:text-ink-500"
            {...rest}
          />
        </div>
        {hint && (
          <span className={cn("text-caption", invalid ? "text-danger-500" : "text-ink-500 dark:text-ink-400")}>
            {hint}
          </span>
        )}
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";
