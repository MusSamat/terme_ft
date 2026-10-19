"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getChatSummaries } from "@/lib/api/chat";
import { getSocket } from "@/lib/socket/client";
import { useAuth } from "@/store/auth";

/**
 * Total unread chat messages across accepted-booking chats.
 * Kept live via socket: chat:message invalidates ["chat","summaries"]
 * even when no chat screen is mounted (badge in the bottom nav).
 */
export function useUnreadMessages() {
  const isAuthenticated = useAuth((s) => s.status === "authenticated");
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    const onChatMessage = () => {
      void qc.invalidateQueries({ queryKey: ["chat", "summaries"] });
    };
    socket.on("chat:message", onChatMessage);
    return () => {
      socket.off("chat:message", onChatMessage);
    };
  }, [isAuthenticated, qc]);

  return useQuery({
    queryKey: ["chat", "summaries"],
    queryFn: getChatSummaries,
    enabled: isAuthenticated,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    select: (chats) =>
      chats
        // Same set the chat hub lists — pre-booking chats count too.
        .filter((c) => c.bookingStatus === "pending" || c.bookingStatus === "viewed" || c.bookingStatus === "accepted")
        .reduce((sum, c) => sum + c.unreadCount, 0),
  });
}
