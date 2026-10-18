"use client";

import { useQuery } from "@tanstack/react-query";
import { getTripsCalendar } from "@/lib/api/trips";
import { getRequestsCalendar } from "@/lib/api/passenger-requests";

/**
 * Per-day counts for a route (trips or passenger requests) — availability
 * hints in date pickers. Returns undefined until loaded / without both ids.
 */
export function useCalendarCounts(
  kind: "trips" | "requests",
  fromId: number | null | undefined,
  toId: number | null | undefined,
  enabled = true,
): Record<string, number> | undefined {
  const { data } = useQuery({
    queryKey: ["calendar-counts", kind, fromId, toId],
    queryFn: () =>
      kind === "requests" ? getRequestsCalendar(fromId!, toId!) : getTripsCalendar(fromId!, toId!),
    enabled: enabled && Boolean(fromId && toId),
    staleTime: 60_000,
  });
  return data;
}
