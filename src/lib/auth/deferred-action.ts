const KEY = "kosho_deferred_action";
const TTL_MS = 15 * 60 * 1000;

export type DeferredAction =
  | { action: "book_trip"; trip_id: string; seats: number; comment?: string }
  | { action: "create_trip" }
  | { action: "create_request" }
  | { action: "view_request"; id: string }
  | { action: "view_trip"; id: string }
  | { action: "like"; target_type: "trip" | "passenger_request"; id: string }
  | { action: "open_chat"; booking_id: string }
  | { action: "rate_user"; trip_id: string; ratee_id: string }
  | { action: "view_contacts"; booking_id: string }
  | { action: "file_complaint"; target_user_id: string; target_trip_id?: string };

interface StoredIntent {
  saved_at: number;
  intent: DeferredAction;
}

export function saveDeferredAction(intent: DeferredAction) {
  if (typeof window === "undefined") return;
  const payload: StoredIntent = { saved_at: Date.now(), intent };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {}
}

export function consumeDeferredAction(): DeferredAction | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
    if (raw) sessionStorage.removeItem(KEY);
  } catch {}
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredIntent;
    if (Date.now() - parsed.saved_at > TTL_MS) return null;
    return parsed.intent;
  } catch {
    return null;
  }
}

export function routeForIntent(intent: DeferredAction): string {
  switch (intent.action) {
    case "book_trip":
      return `/trips/${intent.trip_id}/book?seats=${intent.seats}`;
    case "create_trip":
      return "/trips/create";
    case "create_request":
      return "/requests/create";
    case "view_trip":
      return `/trips/${intent.id}`;
    case "view_request":
      return `/requests/${intent.id}`;
    case "like":
      // Return the user to the item they tried to like — now authenticated they
      // can tap the heart, instead of being dropped on the home feed.
      return intent.target_type === "trip" ? `/trips/${intent.id}` : `/requests/${intent.id}`;
    case "open_chat":
      return `/my/bookings/${intent.booking_id}/chat`;
    case "rate_user":
      return `/trips/${intent.trip_id}/rate/${intent.ratee_id}`;
    case "view_contacts":
      return `/my/bookings/${intent.booking_id}/chat`; // no standalone booking page
    case "file_complaint":
      return intent.target_trip_id
        ? `/complaint?user=${intent.target_user_id}&trip=${intent.target_trip_id}`
        : `/complaint?user=${intent.target_user_id}`;
  }
}
