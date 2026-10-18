import { create } from "zustand";
import { setAccessToken, markSessionHint, clearSessionHint } from "@/lib/api/client";
import { getMe, updateProfile } from "@/lib/api/auth";
import type { AuthResult, SelfUser } from "@/lib/api/types";

type Status = "idle" | "loading" | "authenticated" | "anonymous";
export type ActiveMode = "driver" | "passenger";

// Driver / passenger mode = what home leads with and the «+» default. One source
// of truth: users.preferredMode (shared with the mobile app and the Telegram
// bot); guests keep their choice locally.
const GUEST_MODE_KEY = "terme_mode";

function readGuestMode(): ActiveMode {
  try {
    return typeof window !== "undefined" && localStorage.getItem(GUEST_MODE_KEY) === "driver"
      ? "driver"
      : "passenger";
  } catch {
    return "passenger";
  }
}

function writeGuestMode(mode: ActiveMode) {
  try {
    if (typeof window !== "undefined") localStorage.setItem(GUEST_MODE_KEY, mode);
  } catch {}
}

const modeOf = (user: SelfUser | null): ActiveMode =>
  user?.preferredMode === "driver" ? "driver" : "passenger";

interface AuthState {
  user: SelfUser | null;
  status: Status;
  activeMode: ActiveMode;
  setStatus: (s: Status) => void;
  /** Optimistic; persisted to the account (or locally for guests). */
  setActiveMode: (mode: ActiveMode) => void;
  hydrate: (user: SelfUser) => void;
  setSession: (result: AuthResult) => void;
  clearSession: () => void;
  updateUser: (patch: Partial<SelfUser>) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",
  activeMode: readGuestMode(),
  setStatus: (status) => set({ status, ...(status === "anonymous" ? { activeMode: readGuestMode() } : {}) }),
  setActiveMode: (mode) => {
    const { user, activeMode: prev } = get();
    if (mode === prev) return;
    set({ activeMode: mode, ...(user ? { user: { ...user, preferredMode: mode } } : {}) });
    if (!user) {
      writeGuestMode(mode);
      return;
    }
    updateProfile({ preferredMode: mode }).catch(() => {
      const u = get().user;
      set({ activeMode: prev, ...(u ? { user: { ...u, preferredMode: prev } } : {}) });
    });
  },
  hydrate: (user) => set({ user, status: "authenticated", activeMode: modeOf(user) }),
  setSession: (result) => {
    setAccessToken(result.accessToken ?? null);
    if (result.accessToken) markSessionHint();
    else clearSessionHint();
    // AuthResult carries a short user; load the full profile (preferredMode,
    // hasPassword, …) right after so every screen sees the real account.
    const user = result.user as unknown as SelfUser;
    set({ user, status: "authenticated" });
    if (!result.accessToken) return;
    getMe()
      .then((full) => get().hydrate(full))
      .catch(() => undefined);
  },
  clearSession: () => {
    setAccessToken(null);
    clearSessionHint();
    set({ user: null, status: "anonymous", activeMode: readGuestMode() });
  },
  updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
}));
