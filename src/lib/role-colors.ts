// Role colour language (two-brand palette: teal + amber over warm neutrals):
//   guest = ink (warm gray); passenger and driver share ONE teal recipe —
// the roles are told apart by icon + label, never by colour. Primary CTAs are
// amber everywhere; teal drives nav, headers, chips and selection.
//
// Every string is a literal so Tailwind's scanner picks them up (no safelist).

export type UiRole = "guest" | "passenger" | "driver";

export interface RoleTheme {
  /** i18n key under `roles.*` */
  labelKey: string;
  /** lucide icon name used next to the role label */
  icon: "eye" | "user" | "car-front";
  /** role pill: «Гость» / «Пассажир» / «Водитель» */
  badge: string;
  /** bottom-nav active tab background */
  navPillOn: string;
  /** bottom-nav active tab icon/label color */
  navTextOn: string;
  /** accent "on" text (tabs, links) */
  textOn: string;
  /** screen hero header surface (create, profile) — flat */
  headerGrad: string;
  /** wide banner surface (profile hero, promos) — flat */
  bannerGrad: string;
  /** primary CTA (publish/find buttons) — amber */
  ctaFilled: string;
  /** selected date-chip */
  chipSelected: string;
  /** «Гибко» special chip */
  flexChip: string;
  /** leading icons in inputs/fields */
  iconAccent: string;
  /** seats-stepper count text */
  counterText: string;
  /** role-tinted letter avatar */
  avatarTint: string;
  /** active tab underline bar */
  tabUnderline: string;
}

type RoleColorRecipe = Omit<RoleTheme, "labelKey" | "icon">;

const TEAL: RoleColorRecipe = {
  badge: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  navPillOn: "bg-brand-50 dark:bg-brand-500/15",
  navTextOn: "text-brand-700 dark:text-brand-300",
  textOn: "text-brand-700 dark:text-brand-300",
  headerGrad: "bg-brand-600",
  bannerGrad: "bg-brand-600",
  ctaFilled: "bg-accent-500 text-accent-ink shadow-cta",
  chipSelected: "bg-brand-600 text-white",
  flexChip: "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  iconAccent: "text-brand-600",
  counterText: "text-brand-600 dark:text-brand-300",
  avatarTint: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200",
  tabUnderline: "bg-brand-600",
};

export const ROLE_THEME: Record<UiRole, RoleTheme> = {
  guest: {
    labelKey: "guest",
    icon: "eye",
    badge: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
    navPillOn: "bg-ink-100 dark:bg-ink-800",
    navTextOn: "text-ink-700 dark:text-ink-200",
    textOn: "text-ink-700 dark:text-ink-200",
    headerGrad: "bg-ink-600",
    bannerGrad: "bg-ink-600",
    ctaFilled: "bg-accent-500 text-accent-ink shadow-cta",
    chipSelected: "bg-ink-700 text-white",
    flexChip: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
    iconAccent: "text-ink-500",
    counterText: "text-ink-700 dark:text-ink-200",
    avatarTint: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
    tabUnderline: "bg-ink-500",
  },
  passenger: { labelKey: "passenger", icon: "user", ...TEAL },
  driver: { labelKey: "driver", icon: "car-front", ...TEAL },
} as const;

// ---------------------------------------------------------------------------
// Deprecated: pre-redesign map, kept so untouched screens compile during the
// screen-by-screen migration. Remove once Phase C lands everywhere.
const LEGACY_TEAL = {
  navActive:     "text-brand-600",
  navActivePill: "bg-brand-50 text-brand-700",
  avatarRingOn:  "ring-brand-600",
  avatarRingOff: "ring-brand-200 hover:ring-brand-400",
  avatarBgOn:    "bg-brand-600 text-white",
  avatarBgOff:   "bg-brand-100 text-brand-700",
  profileRing:   "ring-brand-500",
} as const;

export const ROLE_COLORS = {
  passenger: LEGACY_TEAL,
  driver: LEGACY_TEAL,
} as const;

export type RoleColors = (typeof ROLE_COLORS)[keyof typeof ROLE_COLORS];
