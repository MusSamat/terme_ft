import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  saveDeferredAction,
  consumeDeferredAction,
  routeForIntent,
  type DeferredAction,
} from "@/lib/auth/deferred-action";

const KEY = "kosho_deferred_action";

beforeEach(() => {
  sessionStorage.clear();
});

// ─── saveDeferredAction ───────────────────────────────────────────────────────

describe("saveDeferredAction", () => {
  it("writes a JSON blob with saved_at + intent to sessionStorage", () => {
    const intent: DeferredAction = { action: "book_trip", trip_id: "t1", seats: 2 };
    saveDeferredAction(intent);
    const raw = sessionStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.intent).toEqual(intent);
    expect(typeof parsed.saved_at).toBe("number");
  });

  it("overwrites a previous entry", () => {
    saveDeferredAction({ action: "book_trip", trip_id: "t1", seats: 1 });
    saveDeferredAction({ action: "open_chat", booking_id: "b1" });
    const raw = JSON.parse(sessionStorage.getItem(KEY)!);
    expect(raw.intent.action).toBe("open_chat");
  });
});

// ─── consumeDeferredAction ────────────────────────────────────────────────────

describe("consumeDeferredAction", () => {
  it("returns the intent and removes the key", () => {
    const intent: DeferredAction = { action: "open_chat", booking_id: "b42" };
    saveDeferredAction(intent);
    expect(consumeDeferredAction()).toEqual(intent);
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("returns null when storage is empty", () => {
    expect(consumeDeferredAction()).toBeNull();
  });

  it("returns null and removes the key when TTL is exceeded", () => {
    const intent: DeferredAction = { action: "open_chat", booking_id: "b1" };
    // Manually set an entry 16 minutes old (> 15 min TTL)
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ saved_at: Date.now() - 16 * 60 * 1000, intent }),
    );
    expect(consumeDeferredAction()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("returns the intent when within TTL", () => {
    const intent: DeferredAction = { action: "rate_user", trip_id: "t1", ratee_id: "u1" };
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ saved_at: Date.now() - 5 * 60 * 1000, intent }),
    );
    expect(consumeDeferredAction()).toEqual(intent);
  });

  it("returns null and clears key when JSON is malformed", () => {
    sessionStorage.setItem(KEY, "not-json{{");
    expect(consumeDeferredAction()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
});

// ─── routeForIntent ───────────────────────────────────────────────────────────

describe("routeForIntent", () => {
  it("book_trip — includes trip_id and seats in URL", () => {
    const route = routeForIntent({ action: "book_trip", trip_id: "abc", seats: 3 });
    expect(route).toBe("/trips/abc/book?seats=3");
  });

  it("create_trip — returns to the create screen (not a bogus /trips//book)", () => {
    const route = routeForIntent({ action: "create_trip" });
    expect(route).toBe("/trips/create");
    expect(route).not.toContain("//");
  });

  it("like — returns to the trip or request the guest tried to like", () => {
    expect(routeForIntent({ action: "like", target_type: "trip", id: "t9" })).toBe("/trips/t9");
    expect(routeForIntent({ action: "like", target_type: "passenger_request", id: "r9" })).toBe(
      "/requests/r9",
    );
  });

  it("open_chat — routes to the chat page", () => {
    expect(routeForIntent({ action: "open_chat", booking_id: "bk1" })).toBe(
      "/my/bookings/bk1/chat",
    );
  });

  it("rate_user — includes trip_id and ratee_id", () => {
    expect(routeForIntent({ action: "rate_user", trip_id: "t1", ratee_id: "u1" })).toBe(
      "/trips/t1/rate/u1",
    );
  });

  it("view_contacts — opens the booking chat (no standalone booking page)", () => {
    expect(routeForIntent({ action: "view_contacts", booking_id: "bk2" })).toBe(
      "/my/bookings/bk2/chat",
    );
  });

  it("create_request / view_trip / view_request return to the right page", () => {
    expect(routeForIntent({ action: "create_request" })).toBe("/requests/create");
    expect(routeForIntent({ action: "view_trip", id: "t1" })).toBe("/trips/t1");
    expect(routeForIntent({ action: "view_request", id: "r1" })).toBe("/requests/r1");
  });

  it("file_complaint without trip — only user param", () => {
    expect(routeForIntent({ action: "file_complaint", target_user_id: "u1" })).toBe(
      "/complaint?user=u1",
    );
  });

  it("file_complaint with trip — includes both user and trip params", () => {
    expect(
      routeForIntent({ action: "file_complaint", target_user_id: "u1", target_trip_id: "t2" }),
    ).toBe("/complaint?user=u1&trip=t2");
  });
});
