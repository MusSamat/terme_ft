import { io, type Socket } from "socket.io-client";
import { getAccessToken, hasSessionHint, refreshAccessToken } from "@/lib/api/client";
import { attachAuthRecovery } from "./auth-recovery";

let socket: Socket | null = null;
let detachRecovery: (() => void) | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_WS_URL ?? "";
    socket = io(url, {
      transports: ["websocket"],
      auth: { token: getAccessToken() },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      reconnectionAttempts: Infinity,
      autoConnect: false,
    });

    // Expired token (server drop or rejected handshake) → refresh, new
    // handshake token, reconnect; stops once signed out (no session hint).
    detachRecovery = attachAuthRecovery(socket, {
      refresh: refreshAccessToken,
      isLoggedIn: hasSessionHint,
    });
  }
  // Always stamp the current token — covers the case where the socket was
  // created before auth completed, or after an access-token refresh.
  socket.auth = { token: getAccessToken() };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  detachRecovery?.();
  detachRecovery = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Call this whenever a new access token is obtained (bootstrap + silent refresh).
export function refreshSocketAuth() {
  if (!socket) return;
  socket.auth = { token: getAccessToken() };
  // The token is checked only at handshake: a live connection stays valid, so
  // reconnect only when down (a forced bounce would drop events in the gap).
  if (!socket.connected) socket.connect();
}
