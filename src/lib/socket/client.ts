import { io, type Socket } from "socket.io-client";
import { getAccessToken, refreshAccessToken } from "@/lib/api/client";

let socket: Socket | null = null;
let refreshingSocket = false;

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

    // Handshake rejected by the auth middleware: no token (auth_required),
    // unknown user (auth_failed) or an expired / invalid access token (the
    // AppError message, e.g. "Access token has expired"). socket.io does NOT
    // auto-reconnect after a middleware rejection — refresh, then reconnect.
    socket.on("connect_error", (err) => {
      const msg = (err as Error).message;
      const authError = msg === "auth_required" || msg === "auth_failed" || /token|unauthori/i.test(msg);
      if (!authError || refreshingSocket) return;
      refreshingSocket = true;
      refreshAccessToken()
        .then(() => {
          if (!socket) return;
          socket.auth = { token: getAccessToken() };
          if (!socket.connected) socket.connect();
        })
        .catch(() => {
          // refresh failed — the API layer logs the user out on its next 401
        })
        .finally(() => {
          refreshingSocket = false;
        });
    });
  }
  // Always stamp the current token — covers the case where the socket was
  // created before auth completed, or after an access-token refresh.
  socket.auth = { token: getAccessToken() };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
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
