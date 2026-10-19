import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/lib/api/notifications";
import { useAuth } from "@/store/auth";

export function useUnreadCount() {
  const isAuthenticated = useAuth((s) => s.status === "authenticated");

  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      // The backend returns the exact total; data.length would cap at the page size.
      const res = await getNotifications({ unread: true, limit: 1 });
      return res.unreadCount ?? res.data.length;
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
