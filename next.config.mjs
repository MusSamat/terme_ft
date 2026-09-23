import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

// Gated behind ANALYZE=true — `ANALYZE=true npm run build` emits the report.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // dev — backend serves all static files (avatars, car photos, docs)
      { protocol: "http", hostname: "localhost", port: "3000", pathname: "/**" },
      // prod terme
      { protocol: "https", hostname: "api.terme.kg", pathname: "/**" },
      { protocol: "https", hostname: "files.terme.kg", pathname: "/**" },
      // cloudflare tunnel (staging/testing)
      { protocol: "https", hostname: "*.trycloudflare.com", pathname: "/**" },
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
    ],
  },
};

// Enable the instrumentation hook (which loads the Sentry server/edge configs)
// only when Sentry is active.
const configWithInstrumentation = SENTRY_DSN
  ? {
      ...nextConfig,
      experimental: { ...(nextConfig.experimental ?? {}), instrumentationHook: true },
    }
  : nextConfig;

const composed = withBundleAnalyzer(withNextIntl(configWithInstrumentation));

// Wrap with Sentry only when a DSN is configured, so a missing DSN or
// auth-token never affects the build. No DSN => fully inert, no overhead.
export default SENTRY_DSN
  ? withSentryConfig(composed, {
      silent: true,
      widenClientFileUpload: true,
    })
  : composed;
