import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

// Recipes — design-spec §1.7 (common atoms). Every string literal so the
// Tailwind scanner sees all classes (incl. dark: variants).
const CTA = "bg-accent-500 text-accent-ink shadow-cta hover:bg-accent-400 focus-visible:ring-accent-500";
const GHOST = "bg-ink-100 text-ink-700 hover:bg-ink-200 focus-visible:ring-ink-400 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700";
const TEXT_GHOST = "bg-transparent font-800 text-ink-500 hover:text-ink-800 focus-visible:ring-ink-400 dark:text-ink-400 dark:hover:text-ink-100";
const INVERT = "bg-ink-900 text-white hover:bg-ink-800 focus-visible:ring-ink-700 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100";
// Non-primary filled buttons are neutral (two-brand palette: amber = the one
// primary CTA, teal = selection only).
const BRAND = INVERT;
const DANGER_SOFT = "bg-danger-50 text-danger-600 hover:bg-danger-100 focus-visible:ring-danger-400 dark:bg-danger-500/10 dark:hover:bg-danger-500/20";
const OUTLINE = "border-2 border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-700 focus-visible:ring-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-brand-500 dark:hover:text-brand-300";
const DANGER_SOLID = "bg-danger-500 text-white hover:bg-danger-600 focus-visible:ring-danger-500";
const SECONDARY = "bg-brand-50 text-brand-700 hover:bg-brand-100 focus-visible:ring-brand-500 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25";

const buttonVariants = cva(
  "inline-flex touch-manipulation items-center justify-center gap-2 whitespace-nowrap font-900 transition duration-100 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-ink-950",
  {
    variants: {
      variant: {
        /** amber primary CTA */
        cta: CTA,
        /** neutral filled (non-primary action) */
        brand: BRAND,
        /** filled gray secondary */
        ghost: GHOST,
        /** text-only ghost */
        textGhost: TEXT_GHOST,
        /** dark-inversion («Изменить пароль», offline «Повторить») */
        invert: INVERT,
        /** soft destructive («Выйти») */
        dangerSoft: DANGER_SOFT,
        outline: OUTLINE,
        /** = ghost, semantically paired with a lock icon (guest-gated CTA) */
        lock: GHOST,
        // ---- deprecated aliases (pre-redesign names; kept so existing screens compile) ----
        /** @deprecated use `cta` */
        submit: CTA,
        /** @deprecated use `brand` */
        primary: BRAND,
        /** @deprecated use `ghost` (brand-tinted secondary) */
        secondary: SECONDARY,
        /** @deprecated use `dangerSoft` (or keep solid for destructive confirms) */
        danger: DANGER_SOLID,
        /** @deprecated use `cta` + `pill` prop */
        pill: CTA,
      },
      size: {
        sm: "h-9 rounded-xl px-4 text-[13px]",
        md: "h-11 rounded-2xl px-5 text-[14px]",
        lg: "h-12 rounded-2xl px-6 text-[15px]",
        xl: "h-14 rounded-2xl px-7 text-[16px]",
      },
      pill: {
        true: "rounded-full px-4",
        false: "",
      },
    },
    compoundVariants: [{ variant: "pill", class: "rounded-full" }],
    defaultVariants: { variant: "brand", size: "md", pill: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, pill, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, pill }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
