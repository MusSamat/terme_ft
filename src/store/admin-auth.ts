import { create } from "zustand";

// Refresh token now lives in an HttpOnly cookie (TZ §5/§26.1) — we persist only
// the non-sensitive admin profile so the session can be restored on reload.
const ADMIN_INFO_KEY = "terme_admin_info";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "superadmin";
  // Set from the login response; a temp password must be replaced first.
  mustChangePassword?: boolean;
}

interface AdminAuthState {
  token: string | null; // access token — memory only
  admin: AdminUser | null;
  expiresAt: number | null; // ms when access token expires
  setSession: (params: {
    accessToken: string;
    admin: AdminUser;
    accessTokenExpiresIn: number;
    refreshToken?: string;
  }) => void;
  hydrateAdmin: (accessToken: string, admin: AdminUser, expiresAt: number) => void;
  setAccessToken: (token: string, expiresIn: number) => void;
  clearSession: () => void;
}

export const useAdminAuth = create<AdminAuthState>((set) => ({
  token: null,
  admin: null,
  expiresAt: null,

  setSession: ({ accessToken, admin, accessTokenExpiresIn }) => {
    try {
      localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin));
    } catch {}
    set({ token: accessToken, admin, expiresAt: Date.now() + accessTokenExpiresIn * 1000 });
  },

  // Restores memory state without touching storage — used by AdminAuthBootstrap on page load.
  hydrateAdmin: (accessToken, admin, expiresAt) => set({ token: accessToken, admin, expiresAt }),

  setAccessToken: (token, expiresIn) =>
    set((s) => ({ token, expiresAt: Date.now() + expiresIn * 1000, admin: s.admin })),

  clearSession: () => {
    try {
      localStorage.removeItem(ADMIN_INFO_KEY);
    } catch {}
    set({ token: null, admin: null, expiresAt: null });
  },
}));

export const getAdminToken = (): string | null => useAdminAuth.getState().token;

export function getStoredAdminInfo(): AdminUser | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(ADMIN_INFO_KEY) : null;
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}
