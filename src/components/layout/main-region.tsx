"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Wraps page content and reserves bottom clearance for the floating mobile
 * bottom-nav — but only where nothing else already does.
 *   - chat: manages its own full-height layout (chat-page-wrapper).
 *   - onboarding: fills its own 100dvh and clears the nav itself.
 *   - everything else (incl. home "/"): app screens with no footer on mobile →
 *     pad clears the floating bottom-nav.
 * On desktop the pad is a no-op (`md:pb-0`).
 */
export function MainRegion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // /onboarding fills its own 100dvh and clears the nav itself — adding the
  // 96px main pad on top of that would overflow the viewport and force a scroll.
  const selfManaged =
    pathname.includes("/chat") || pathname === "/onboarding";
  return <main className={cn(!selfManaged && "main-mobile-pad")}>{children}</main>;
}
