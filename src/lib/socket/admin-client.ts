import { io, type Socket } from "socket.io-client";
import { getAdminToken } from "@/store/admin-auth";
import { refreshAdminAccessToken } from "@/lib/api/admin";
import { attachAuthRecovery } from "./auth-recovery";

// Dedicated admin socket. The shared user socket (lib/socket/client) is stamped
// with the *user* access token; admin realtime needs the admin access token so
// the backend can auto-join the `admin:<id>` room. Kept separate so the two
// connections never clobber each other's `auth.token`.
let socket: Socket | null = null;
let detachRecovery: (() => void) | null = null;

export function getAdminSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_WS_URL ?? "";
    socket = io(url, {
      transports: ["websocket"],
      auth: { token: getAdminToken() },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      reconnectionAttempts: Infinity,
      autoConnect: false,
    });
    // Token expiry drops the socket (auth:expired / server disconnect) →
    // refresh the admin token, re-stamp the handshake, reconnect.
    detachRecovery = attachAuthRecovery(socket, {
      refresh: refreshAdminAccessToken,
      isLoggedIn: () => !!getAdminToken(),
    });
  }
  // Always stamp the current admin token before (re)connecting.
  socket.auth = { token: getAdminToken() };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectAdminSocket() {
  detachRecovery?.();
  detachRecovery = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
