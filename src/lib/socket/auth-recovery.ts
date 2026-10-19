import type { Socket } from "socket.io-client";

// The backend drops a socket when its access token expires: it emits
// `auth:expired`, then disconnects (reason "io server disconnect"). socket.io
// never auto-reconnects after a server-side disconnect or a handshake rejected
// by the auth middleware, so we refresh the token, stamp it into the handshake
// auth and reconnect — with exponential backoff and a cap so a dead session
// can't loop, and never once the user has signed out.

type RecoverableSocket = Pick<Socket, "on" | "off" | "connect" | "connected" | "auth">;

export interface AuthRecoveryOptions {
  /** Resolves a fresh access token; a rejection is retried with backoff (except a 401). */
  refresh: () => Promise<string>;
  /** False once signed out — recovery stops and never reconnects. */
  isLoggedIn: () => boolean;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  /** A connection that survives this long resets the backoff. */
  stableMs?: number;
}

export function isSocketAuthError(message: string): boolean {
  return message === "auth_required" || message === "auth_failed" || /token|unauthori/i.test(message);
}

export function attachAuthRecovery(socket: RecoverableSocket, opts: AuthRecoveryOptions): () => void {
  const baseDelay = opts.baseDelayMs ?? 1000;
  const maxDelay = opts.maxDelayMs ?? 30_000;
  const maxAttempts = opts.maxAttempts ?? 6;
  const stableMs = opts.stableMs ?? 10_000;

  let attempts = 0;
  let busy = false;
  let expired = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let stableTimer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (busy || retryTimer || !opts.isLoggedIn() || attempts >= maxAttempts) return;
    const delay = attempts === 0 ? 0 : Math.min(baseDelay * 2 ** (attempts - 1), maxDelay);
    attempts += 1;
    retryTimer = setTimeout(run, delay);
  };

  const run = () => {
    retryTimer = null;
    if (!opts.isLoggedIn()) return;
    busy = true;
    opts
      .refresh()
      .then((token) => {
        busy = false;
        if (!opts.isLoggedIn()) return;
        socket.auth = { token };
        if (!socket.connected) socket.connect();
      })
      .catch((err: unknown) => {
        busy = false;
        // 401 = the session itself is gone (revoked/expired refresh) — retrying
        // can't help; the HTTP layer signs the user out.
        if ((err as { response?: { status?: number } })?.response?.status === 401) return;
        schedule();
      });
  };

  const onConnect = () => {
    if (stableTimer) clearTimeout(stableTimer);
    stableTimer = setTimeout(() => {
      attempts = 0;
    }, stableMs);
  };

  const onDisconnect = (reason: string) => {
    if (stableTimer) clearTimeout(stableTimer);
    stableTimer = null;
    if (reason === "io server disconnect" || expired) {
      expired = false;
      schedule();
    }
  };

  const onAuthExpired = () => {
    expired = true;
  };

  const onConnectError = (err: Error) => {
    if (isSocketAuthError(err.message)) schedule();
  };

  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.on("auth:expired", onAuthExpired);
  socket.on("connect_error", onConnectError);

  return () => {
    socket.off("connect", onConnect);
    socket.off("disconnect", onDisconnect);
    socket.off("auth:expired", onAuthExpired);
    socket.off("connect_error", onConnectError);
    if (retryTimer) clearTimeout(retryTimer);
    if (stableTimer) clearTimeout(stableTimer);
    retryTimer = null;
    stableTimer = null;
  };
}
