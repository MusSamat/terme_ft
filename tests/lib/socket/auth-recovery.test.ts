import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { attachAuthRecovery, isSocketAuthError } from "@/lib/socket/auth-recovery";

type Handler = (...args: unknown[]) => void;

interface FakeSocket {
  connected: boolean;
  auth: Record<string, unknown>;
  connect: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: (ev: string, ...args: unknown[]) => void;
  count: (ev: string) => number;
}

function fakeSocket(): FakeSocket {
  const handlers = new Map<string, Set<Handler>>();
  const s: FakeSocket = {
    connected: true,
    auth: { token: "old" } as Record<string, unknown>,
    connect: vi.fn(() => s),
    on: vi.fn((ev: string, h: Handler) => {
      if (!handlers.has(ev)) handlers.set(ev, new Set());
      handlers.get(ev)!.add(h);
      return s;
    }),
    off: vi.fn((ev: string, h: Handler) => {
      handlers.get(ev)?.delete(h);
      return s;
    }),
    emit(ev: string, ...args: unknown[]) {
      handlers.get(ev)?.forEach((h) => h(...args));
    },
    count(ev: string) {
      return handlers.get(ev)?.size ?? 0;
    },
  };
  return s;
}

// The server's M1 expiry: `auth:expired`, then a server-side disconnect.
function expire(s: FakeSocket) {
  s.emit("auth:expired", { reason: "token_expired" });
  s.connected = false;
  s.emit("disconnect", "io server disconnect");
}

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("attachAuthRecovery", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("refreshes, stamps the new token and reconnects after auth:expired", async () => {
    const s = fakeSocket();
    const refresh = vi.fn().mockResolvedValue("fresh");
    attachAuthRecovery(s as never, { refresh, isLoggedIn: () => true });

    expire(s);
    await flush();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(s.auth).toEqual({ token: "fresh" });
    expect(s.connect).toHaveBeenCalledTimes(1);
  });

  it("recovers from a handshake rejected for an expired token", async () => {
    const s = fakeSocket();
    s.connected = false;
    const refresh = vi.fn().mockResolvedValue("fresh");
    attachAuthRecovery(s as never, { refresh, isLoggedIn: () => true });

    s.emit("connect_error", new Error("Access token has expired"));
    await flush();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(s.connect).toHaveBeenCalledTimes(1);
  });

  it("ignores client-side and transport disconnects and non-auth errors", async () => {
    const s = fakeSocket();
    const refresh = vi.fn().mockResolvedValue("fresh");
    attachAuthRecovery(s as never, { refresh, isLoggedIn: () => true });

    s.emit("disconnect", "io client disconnect");
    s.emit("disconnect", "transport close");
    s.emit("connect_error", new Error("websocket error"));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(refresh).not.toHaveBeenCalled();
  });

  it("does nothing once signed out", async () => {
    const s = fakeSocket();
    const refresh = vi.fn().mockResolvedValue("fresh");
    attachAuthRecovery(s as never, { refresh, isLoggedIn: () => false });

    expire(s);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(refresh).not.toHaveBeenCalled();
    expect(s.connect).not.toHaveBeenCalled();
  });

  it("backs off between quick repeat failures and stops at the cap (no loop)", async () => {
    const s = fakeSocket();
    s.connected = false;
    const refresh = vi.fn().mockRejectedValue(new Error("network"));
    attachAuthRecovery(s as never, {
      refresh,
      isLoggedIn: () => true,
      baseDelayMs: 1000,
      maxAttempts: 4,
    });

    s.emit("connect_error", new Error("auth_failed"));
    await flush();
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(refresh).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(4000);
    expect(refresh).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(refresh).toHaveBeenCalledTimes(4);
  });

  it("gives up immediately when the refresh itself is a 401", async () => {
    const s = fakeSocket();
    const refresh = vi.fn().mockRejectedValue({ response: { status: 401 } });
    attachAuthRecovery(s as never, { refresh, isLoggedIn: () => true });

    expire(s);
    await vi.advanceTimersByTimeAsync(120_000);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(s.connect).not.toHaveBeenCalled();
  });

  it("resets the backoff after a stable connection", async () => {
    const s = fakeSocket();
    const refresh = vi.fn().mockResolvedValue("fresh");
    attachAuthRecovery(s as never, { refresh, isLoggedIn: () => true, stableMs: 10_000 });

    expire(s);
    await flush();
    s.connected = true;
    s.emit("connect");
    await vi.advanceTimersByTimeAsync(10_000);

    expire(s);
    await flush();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("detach removes listeners and pending retries", async () => {
    const s = fakeSocket();
    const refresh = vi.fn().mockRejectedValue(new Error("network"));
    const detach = attachAuthRecovery(s as never, { refresh, isLoggedIn: () => true });

    expire(s);
    await flush();
    detach();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(s.count("disconnect")).toBe(0);
    expect(s.count("auth:expired")).toBe(0);
  });
});

describe("isSocketAuthError", () => {
  it("classifies handshake errors", () => {
    expect(isSocketAuthError("auth_required")).toBe(true);
    expect(isSocketAuthError("auth_failed")).toBe(true);
    expect(isSocketAuthError("Access token has expired")).toBe(true);
    expect(isSocketAuthError("xhr poll error")).toBe(false);
  });
});
