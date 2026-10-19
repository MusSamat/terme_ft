"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Wraps page content and reserves bottom clearance for the floating mobile
 * bottom-nav — but only where nothing else already does.
 *   - chat: manages its own full-height layout (chat-page-wrapper).
 *   - everything else (incl. home "/"): app screens with no footer on mobile →
 *     pad clears the floating bottom-nav.
 * On desktop the pad is a no-op (`md:pb-0`).
 */
export function MainRegion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Chat manages its own height.
  const selfManaged = pathname.includes("/chat");
  return <main className={cn(!selfManaged && "main-mobile-pad")}>{children}</main>;
}
