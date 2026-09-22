"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send, MapPin } from "lucide-react";
import { LogoMark, Wordmark, LocaleSwitcher } from "@/components/ui";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils/cn";

export function Footer() {
  const t = useTranslations("footer");
  const pathname = usePathname();
  const year = new Date().getFullYear();

  // App-like / chromeless areas never show the marketing footer.
  const hidden =
    pathname.includes("/chat") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding");
  if (hidden) return null;

  // Mobile has a floating bottom-nav as its chrome → the marketing footer is
  // desktop-only everywhere on mobile (the app-like home hub has no room for it).
  const desktopOnly = true;

  const COLUMNS = [
    {
      title: t("product"),
      items: [
        { href: "/trips", label: t("find_trip") },
        { href: "/trips/create", label: t("publish_trip") },
        { href: "/profile/driver", label: t("become_driver") },
      ],
    },
    {
      title: t("company"),
      items: [
        { href: "/about", label: t("about") },
        { href: "/privacy", label: t("privacy") },
        { href: "/terms", label: t("terms") },
      ],
    },
    {
      title: t("support"),
      items: [
        { href: "https://t.me/tappjet_support", label: t("telegram_support"), external: true },
        { href: "/complaint", label: t("complaint") },
      ],
    },
  ];

  return (
    <footer
      className={cn(
        "border-t border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-950",
        // clear the floating bottom-nav when shown on mobile (home only)
        "pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-0",
        desktopOnly && "hidden md:block",
      )}
    >
      <div className="container py-10 md:py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <LogoMark className="h-8 w-8" />
              <Wordmark className="text-[17px]" />
            </Link>
            <p className="mt-3 max-w-[240px] text-[14px] font-500 leading-relaxed text-ink-500 dark:text-ink-400">
              {t("tagline")}
            </p>
            <a
              href="https://t.me/tappjet_support"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-2 text-[13px] font-800 text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {t("telegram_support")}
            </a>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-[12px] font-800 uppercase tracking-wider text-ink-400">
                {col.title}
              </h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {col.items.map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[15px] font-600 text-ink-600 transition-colors hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-300"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-[15px] font-600 text-ink-600 transition-colors hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-300"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-ink-100 dark:border-ink-800">
        <div className="container flex flex-col items-center gap-3 py-5 md:flex-row md:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[14px] font-600 text-ink-400">
            <span>© {year} Terme</span>
            <span className="hidden md:inline text-ink-300 dark:text-ink-700">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {t("made_in")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
        {/* Legal entity line — required for business verification; small & muted but genuinely visible (no cloaking). */}
        <div className="container pb-5 text-center md:text-left">
          <p className="text-[11px] font-500 leading-relaxed text-ink-400 opacity-70 dark:text-ink-500">
            © {year} terme.kg — {t("legal_entity")}
          </p>
        </div>
      </div>
    </footer>
  );
}
