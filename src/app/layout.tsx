import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import { AuthBootstrap } from "@/components/auth-bootstrap";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { TermsGate } from "@/components/layout/terms-gate";
import { TopNav } from "@/components/layout/top-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MainRegion } from "@/components/layout/main-region";
import { Footer } from "@/components/layout/footer";
import { QuickActions } from "@/components/features/quick-actions/quick-actions";
import { QuickToastContainer } from "@/components/layout/quick-toast";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/theme-provider";
import { WebVitals } from "@/components/web-vitals";
import { buildServiceJsonLd } from "@/lib/seo/org-jsonld";
import "./globals.css";

// Single source for the site meta description — reused in <metadata> and the
// Service JSON-LD so the two never drift apart.
const SITE_DESCRIPTION = "Найди попутчика Бишкек — Ош, Каракол, Нарын, Иссык-Куль.";

// Single self-hosted variable font for the whole app. Manrope has a full
// Cyrillic glyph set (ru/kg), tabular figures, and reads well from 200→800 —
// so body and display share one family (was Nunito body + Fredoka display,
// which silently dropped Russian to Nunito because Fredoka has no Cyrillic).
const manrope = localFont({
  src: "./fonts/Manrope.ttf",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://terme.kg"),
  title: {
    default: "Terme — попутчики Кыргызстана",
    template: "%s | Terme",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: "Terme",
    type: "website",
    locale: "ru_RU",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // env(safe-area-inset-*) used by the bottom nav is 0 on iOS without this.
  viewportFit: "cover",
  // Android Chrome 108+: on-screen keyboard shrinks the layout viewport so
  // focused inputs (chat, OTP) stay visible; bottom nav hides via useKeyboardOpen.
  interactiveWidget: "resizes-content",
  themeColor: "#0D9488",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {/* Sitewide Service structured data — safe: static values, JSON.stringify escapes. */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildServiceJsonLd(SITE_DESCRIPTION)) }}
        />
      </head>
      <body className="min-h-screen font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <Providers>
              <WebVitals />
              <AuthBootstrap />
              <PresenceHeartbeat />
              <TermsGate />
              <TopNav />
              <MainRegion>{children}</MainRegion>
              <Footer />
              <BottomNav />
              <QuickActions />
              <QuickToastContainer />
              <OfflineBanner />
            </Providers>
          </ThemeProvider>
        </NextIntlClientProvider>
        {/* Analytics — loaded only in production so localhost/dev traffic
            doesn't pollute GA4 / Yandex Metrika. No CSP in the app blocks them. */}
        {process.env.NODE_ENV === "production" && (
          <>
            <GoogleAnalytics gaId="G-11LG0MCB8P" />
            <Script id="yandex-metrika" strategy="afterInteractive">
              {`
                (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                (window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
                ym(112423146, 'init', { ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer" });
              `}
            </Script>
            <noscript>
              <div>
                <img
                  src="https://mc.yandex.ru/watch/112423146"
                  style={{ position: "absolute", left: "-9999px" }}
                  alt=""
                />
              </div>
            </noscript>
          </>
        )}
      </body>
    </html>
  );
}
