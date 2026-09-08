"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { Bell, Plus, LogOut, User, BookOpen, MessageCircle, CarFront } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { logout } from "@/lib/api/auth";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { toastError } from "@/components/layout/quick-toast";
import { useAuth } from "@/store/auth";
import { useUnreadCount } from "@/lib/hooks/use-unread-count";
import { useUnreadMessages } from "@/lib/hooks/use-unread-messages";
import { useRoleTheme } from "@/lib/hooks/use-role-colors";
import { normalizeMediaUrl } from "@/lib/utils/media-url";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoMark, Wordmark } from "@/components/ui/logo-mark";
import { OnlineBadge } from "@/components/ui/online-badge";
import { cn } from "@/lib/utils/cn";

// Desktop top navbar — design-spec §1.3.

/** Coral unread count badge (spec §1.2 recipe). */
function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[9px] font-900 text-white ring-2 ring-white dark:ring-ink-900">
      {count > 99 ? "99+" : count}
    </span>
  );
}

const ICON_BTN =
  "relative flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-colors hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700";

function UserDropdown({ onClose }: { onClose: () => void }) {
  const t = useTranslations("top_nav");
  const router = useRouter();
  const fe = useFriendlyError();
  const user = useAuth((s) => s.user);
  const clearSession = useAuth((s) => s.clearSession);
  const activeMode = useAuth((s) => s.activeMode);
  const { theme } = useRoleTheme();

  const logoutMut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearSession();
      router.replace("/");
      onClose();
    },
    onError: (e) => toastError(fe(extractError(e))),
  });

  const links = [
    { href: "/profile",     label: t("profile_link"), icon: User },
    { href: "/my/bookings", label: t("my_trips"),      icon: BookOpen },
  ];

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift dark:border-ink-800 dark:bg-ink-900">
      <div className="border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <p className="truncate text-[15px] font-900 text-ink-900 dark:text-white">{user?.name}</p>
        <p className="truncate text-[14px] font-700 text-ink-400">{user?.phone}</p>
        <p className={cn("mt-0.5 text-[13px] font-800", theme.textOn)}>
          {activeMode === "driver" ? t("driver_label") : t("passenger_label")}
        </p>
      </div>

      <div className="py-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href + label}
            href={href}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-800 text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
          >
            <Icon className="h-4 w-4 text-ink-400" aria-hidden="true" />
            {label}
          </Link>
        ))}
        {!user?.roles?.includes("driver") && (
          <Link
            href="/profile/driver"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-800 text-grape-700 hover:bg-grape-50 dark:text-grape-300 dark:hover:bg-grape-500/10"
          >
            <CarFront className="h-4 w-4 text-grape-600 dark:text-grape-400" aria-hidden="true" />
            {t("become_driver")}
          </Link>
        )}
      </div>

      <div className="border-t border-ink-100 py-1 dark:border-ink-800">
        <button
          type="button"
          onClick={() => logoutMut.mutate()}
          disabled={logoutMut.isPending}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-[14px] font-800 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {logoutMut.isPending ? t("logging_out") : t("logout")}
        </button>
      </div>
    </div>
  );
}

export function TopNav() {
  const t = useTranslations("top_nav");
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.status === "authenticated");
  const activeMode = useAuth((s) => s.activeMode);
  const { theme } = useRoleTheme();
  const { data: unreadNotif = 0 } = useUnreadCount();
  const { data: unreadMessages = 0 } = useUnreadMessages();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [dropOpen]);

  useEffect(() => { setDropOpen(false); }, [pathname]);

  const isDriver = activeMode === "driver";
  const createHref = isDriver ? "/trips/create" : "/requests/create";

  const navLinks = isAuthenticated
    ? isDriver
      ? [
          // Driver primary tool is browsing passenger requests to respond to;
          // the passenger-only «Найти поездку» browse is hidden.
          { href: "/requests",    label: t("passenger_requests") },
          { href: "/my/bookings", label: t("my_trips") },
        ]
      : [
          { href: "/trips",       label: t("find_trip") },
          { href: "/my/bookings", label: t("my_trips") },
        ]
    : [
        { href: "/trips",    label: t("trips") },
        { href: "/requests", label: t("requests") },
      ];

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? "?";
  const avatarSrc = normalizeMediaUrl(user?.avatarUrl);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => { setAvatarFailed(false); }, [avatarSrc]);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-ink-100 bg-white/85 backdrop-blur md:block dark:border-ink-800 dark:bg-ink-950/85">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <Wordmark className="text-[16px]" />
        </Link>

        {/* Nav links */}
        <nav className="flex flex-1 items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[14px] font-800 transition-colors",
                  active
                    ? cn(theme.navPillOn, theme.navTextOn, "font-900")
                    : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <OnlineBadge className="mr-1" />
          {isAuthenticated ? (
            <>
              <Link
                href={createHref}
                className="flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-1.5 text-[13px] font-900 text-accent-ink shadow-cta transition-colors hover:bg-accent-400"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("create_btn")}
              </Link>

              <Link href="/chat" aria-label={t("messages_aria")} className={ICON_BTN}>
                <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
                <UnreadBadge count={unreadMessages} />
              </Link>

              <Link href="/notifications" aria-label={t("notifications_aria")} className={ICON_BTN}>
                <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
                <UnreadBadge count={unreadNotif} />
              </Link>

              <ThemeToggle />

              {/* User avatar + dropdown */}
              <div className="relative" ref={dropRef}>
                <button
                  type="button"
                  onClick={() => setDropOpen((o) => !o)}
                  aria-label={t("user_menu_aria")}
                  aria-expanded={dropOpen}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-[13px] font-900",
                    theme.badge,
                  )}
                >
                  {avatarSrc && !avatarFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt={user?.name ?? t("avatar_alt")}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    initial
                  )}
                </button>
                {dropOpen && <UserDropdown onClose={() => setDropOpen(false)} />}
              </div>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link
                href="/auth/login"
                className="rounded-full bg-accent-500 px-4 py-1.5 text-[13px] font-900 text-accent-ink shadow-cta transition-colors hover:bg-accent-400"
              >
                {t("sign_in_btn")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
