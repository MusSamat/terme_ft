import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Design tokens — mirror the Terme Prototype (claude.ai/design, terme-proto.js).
// brand = teal (passenger accent), grape = indigo (driver accent), ink = warm stone
// neutrals, accent = amber CTA (text on amber uses accent-ink #4A2C00).
const brand = {
  50: "#ECFDF8",
  100: "#D0FBEF",
  200: "#A4F4DF",
  300: "#6FE7CC",
  400: "#38D3B6",
  500: "#14B8A6",
  600: "#0D9488",
  700: "#0F766E",
  800: "#115E56",
  900: "#134E48",
};
const accent = {
  50: "#FFF8EB",
  100: "#FEEFC7",
  200: "#FDDF8A",
  300: "#FCCB4D",
  400: "#FBB924",
  500: "#F59E0B",
  600: "#D97706",
  700: "#B45309",
  // Text color on amber-filled surfaces (buttons, badges)
  ink: "#4A2C00",
};
const ink = {
  // Warm single light background (inDrive/wb style), parity with the Flutter
  // app — the one page background everywhere. Was #FAFAF9 (near-white).
  50: "#F1F0EC",
  100: "#F5F5F4",
  200: "#E7E5E4",
  300: "#D6D3D1",
  400: "#A8A29E",
  500: "#78716C",
  600: "#57534E",
  700: "#44403C",
  800: "#292524",
  900: "#1C1917",
  950: "#0C0A09",
};

const config: Config = {
  // src/lib holds class-name constants too (role-colors.ts: headerGrad etc.) —
  // without scanning it those classes are purged and headers lose their bg.
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand,
        accent,
        ink,
        coral: { 50: "#FFF1F2", 100: "#FFE4E6", 200: "#FECDD3", 300: "#FDA4AF", 400: "#FB7185", 500: "#F43F5E", 600: "#E11D48", 700: "#BE123C" },
        danger: { 50: "#FEF2F2", 100: "#FEE2E2", 200: "#FECACA", 300: "#FCA5A5", 400: "#F87171", 500: "#EF4444", 600: "#DC2626", 700: "#B91C1C" },
        sky: { 50: "#F0F9FF", 100: "#E0F2FE", 200: "#BAE6FD", 300: "#7DD3FC", 400: "#38BDF8", 500: "#0EA5E9", 600: "#0284C7", 700: "#0369A1" },
        grape: { 50: "#EEF2FF", 100: "#E0E7FF", 200: "#C7D2FE", 300: "#A5B4FC", 400: "#818CF8", 500: "#6366F1", 600: "#4F46E5", 700: "#4338CA" },
        success: "#14B8A6",
        error: "#F43F5E",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        disp: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      fontWeight: {
        "600": "600",
        "700": "700",
        "800": "800",
        "900": "900",
      },
      // rem (1rem = 16px default) so text scales with the user's browser/OS
      // font-size setting — hard px ignores it (accessibility).
      fontSize: {
        display: ["2rem", { lineHeight: "1.12", fontWeight: "900" }],
        h1: ["1.5rem", { lineHeight: "1.2", fontWeight: "800" }],
        h2: ["1.125rem", { lineHeight: "1.3", fontWeight: "800" }],
        "body-lg": ["0.9375rem", { lineHeight: "1.5", fontWeight: "600" }],
        body: ["0.875rem", { lineHeight: "1.5", fontWeight: "600" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "700" }],
        label: ["0.6875rem", { lineHeight: "1.2", fontWeight: "800", letterSpacing: "0.08em" }],
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "6": "24px",
        "8": "32px",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.75rem",
        "5xl": "2.25rem",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(28,25,23,0.05)",
        soft: "0 2px 12px -2px rgba(13,148,136,0.12), 0 10px 30px -14px rgba(28,25,23,0.14)",
        card: "0 1px 3px rgba(28,25,23,0.05), 0 12px 32px -16px rgba(28,25,23,0.16)",
        lift: "0 2px 6px rgba(28,25,23,0.06), 0 26px 50px -20px rgba(28,25,23,0.26)",
        cta: "0 10px 24px -8px rgba(245,158,11,0.5)",
        brandcta: "0 10px 24px -8px rgba(13,148,136,0.5)",
        indigocta: "0 10px 24px -8px rgba(79,70,229,0.45)",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },
      container: {
        center: true,
        padding: {
          DEFAULT: "16px",
          md: "24px",
          lg: "32px",
        },
        screens: {
          xl: "1280px",
        },
      },
    },
  },
  plugins: [animate],
};

export default config;
