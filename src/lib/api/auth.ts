import { api, setAccessToken, setTokens, clearSessionHint } from "./client";
import type { AuthResult, CheckPhoneResult, SelfUser } from "./types";

// Web sign-in flows (backend /auth):
//   new number      → check-phone → send-otp → register (code + name + password)
//   web login       → phone + password
//   forgot password → send-otp → reset-password (also sets a first password for
//                     accounts created in the mobile app / Telegram bot)

export async function checkPhone(phone: string): Promise<CheckPhoneResult> {
  const { data } = await api.post<CheckPhoneResult>("/auth/check-phone", { phone });
  return data;
}

export async function sendOtp(
  phone: string,
): Promise<{ expiresInSec: number; debug_code?: string }> {
  const { data } = await api.post<{ expiresInSec: number; debug_code?: string }>(
    "/auth/phone/send-otp",
    { phone },
  );
  return data;
}

export async function loginWithPassword(phone: string, password: string): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>("/auth/phone/login", {
    phone,
    password,
    channel: "web",
  });
  return data;
}

export async function register(input: {
  phone: string;
  code: string;
  name: string;
  surname: string;
  password: string;
}): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>("/auth/register", { ...input, channel: "web" });
  return data;
}

// WhatsApp code → new password. Revokes every session of the account.
export async function resetPassword(phone: string, code: string, newPassword: string): Promise<void> {
  await api.post("/auth/phone/reset-password", { phone, code, newPassword });
}

export async function logout(): Promise<void> {
  try {
    // The HttpOnly cookie carries the refresh token; the server clears it.
    await api.post("/auth/logout", { channel: "web" });
  } catch {
    // ignore — we clear local state regardless
  } finally {
    setAccessToken(null);
    clearSessionHint();
  }
}

// Revoke every refresh token for the caller (all devices). Local session must
// be cleared by the caller afterwards.
export async function logoutAll(): Promise<void> {
  try {
    await api.post("/auth/logout/all");
  } finally {
    setAccessToken(null);
    clearSessionHint();
  }
}

export async function getMe(): Promise<SelfUser> {
  const { data } = await api.get<SelfUser>("/users/me");
  return data;
}

export async function updateProfile(patch: {
  name?: string;
  surname?: string;
  language?: "ru" | "kg";
  bio?: string;
  termsAccepted?: true;
  preferredMode?: "passenger" | "driver";
}): Promise<SelfUser> {
  const { data } = await api.patch<SelfUser>("/users/me", patch);
  return data;
}

// Change an existing password; 409 password_not_set → use the WhatsApp reset.
// Every session is revoked and this tab gets a fresh pair (refresh → HttpOnly
// cookie via channel=web) — keep the new access token or the tab signs out.
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data } = await api.patch<AuthResult>("/users/me/password", {
    currentPassword,
    newPassword,
    channel: "web",
  });
  if (data.accessToken) setTokens({ accessToken: data.accessToken });
}
