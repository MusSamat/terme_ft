"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/store/admin-auth";
import { AdminAuthBootstrap } from "@/components/admin-auth-bootstrap";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  MessageSquareWarning,
  Car,
  CarFront,
  Inbox,
  Map,
  UserCog,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/admin/verifications", label: "Верификации", icon: ShieldCheck },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/complaints", label: "Жалобы", icon: MessageSquareWarning },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/trips", label: "Поездки", icon: Car },
  { href: "/admin/requests", label: "Заявки", icon: Inbox },
  { href: "/admin/cities", label: "Города", icon: Map },
  { href: "/admin/car-catalog", label: "Автокаталог", icon: CarFront, superadmin: true },
  { href: "/admin/admins", label: "Администраторы", icon: UserCog, superadmin: true },
  { href: "/admin/audit-log", label: "Журнал", icon: ClipboardList },
];

function readCollapsed(): boolean {
  try {
    return typeof window !== "undefined"
      ? localStorage.getItem("admin_sidebar_collapsed") === "true"
      : false;
  } catch {
    return false;
  }
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, admin, clearSession } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  // Read collapsed preference after mount to avoid SSR mismatch
  useEffect(() => {
    setCollapsed(readCollapsed());
    setSidebarReady(true);
  }, []);

  useEffect(() => {
    if (!isLoginPage && !token) router.replace("/admin/login");
    if (isLoginPage && token) router.replace("/admin/dashboard");
  }, [token, isLoginPage, router]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("admin_sidebar_collapsed", String(next)); } catch {}
  }

  if (isLoginPage) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-100">
        <AdminAuthBootstrap />
        {children}
      </div>
    );
  }

  if (!token) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-100">
        <AdminAuthBootstrap />
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink-300 border-t-ink-700" />
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => !n.superadmin || admin?.role === "superadmin");
  const sidebarWidth = sidebarReady && collapsed ? "w-[60px]" : "w-60";

  return (
    <div className="fixed inset-0 z-[100] flex bg-ink-100">
      <AdminAuthBootstrap />

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "relative flex flex-shrink-0 flex-col bg-ink-900 transition-[width] duration-200",
          sidebarWidth,
        )}
      >
        {/* Logo / toggle row */}
        <div
          className={cn(
            "flex items-center border-b border-ink-700/60 px-3 py-4",
            collapsed ? "justify-center" : "justify-between px-5",
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-extrabold text-white">Terme</span>
              <span className="rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold text-accent-ink">
                ADMIN
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Развернуть боковую панель" : "Свернуть боковую панель"}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-700 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center rounded-lg px-2 py-2.5 text-[13px] font-semibold transition-colors",
                  collapsed ? "justify-center" : "gap-3 px-3",
                  active
                    ? "bg-ink-700 text-white"
                    : "text-ink-400 hover:bg-ink-800 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-ink-700/60 px-2 py-3">
          {!collapsed && (
            <div className="mb-2 px-2">
              <p className="truncate text-[12px] font-bold text-white">{admin?.name}</p>
              <p className="truncate text-[11px] text-ink-400">{admin?.email}</p>
              <span
                className={cn(
                  "mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                  admin?.role === "superadmin"
                    ? "bg-accent-500 text-accent-ink"
                    : "bg-ink-700 text-ink-300",
                )}
              >
                {admin?.role ?? "admin"}
              </span>
            </div>
          )}
          <button
            type="button"
            title={collapsed ? "Выйти" : undefined}
            onClick={() => {
              clearSession();
              router.replace("/admin/login");
            }}
            className={cn(
              "flex w-full items-center rounded-lg px-2 py-2 text-[12px] font-semibold text-ink-400 transition-colors hover:bg-ink-800 hover:text-danger-400",
              collapsed ? "justify-center" : "gap-2 px-3",
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && "Выйти"}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
