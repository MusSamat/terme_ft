"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "@/store/admin-auth";
import { getAdminSocket, disconnectAdminSocket } from "@/lib/socket/admin-client";
import { pushToast } from "@/components/layout/quick-toast";

// Admin realtime: the backend joins each admin socket to its `admin:<id>` room
// and emits `notification:new` there. We toast on new complaints and refresh
// the complaints list. Admin strings are hardcoded RU (admin UI has no i18n).
export function AdminNotificationListener() {
  const token = useAdminAuth((s) => s.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;
    const socket = getAdminSocket();

    const onNotification = (data: { type?: string; payload?: { complaint_id?: string } }) => {
      if (data?.type !== "new_complaint") return;
      void queryClient.invalidateQueries({ queryKey: ["admin", "complaints"] });
      pushToast({
        type: "warning",
        title: "Новая жалоба",
        body: "Поступила новая жалоба на модерацию",
      });
    };

    socket.on("notification:new", onNotification);

    return () => {
      socket.off("notification:new", onNotification);
    };
  }, [token, queryClient]);

  // Tear the admin socket down on logout so it doesn't linger with a stale token.
  useEffect(() => {
    if (!token) disconnectAdminSocket();
  }, [token]);

  return null;
}
