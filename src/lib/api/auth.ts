import { api, setAccessToken, clearSessionHint } from "./client";
import type { AnyAuthResult, AuthResult, CheckPhoneResult, SelfUser } from "./types";

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

export async function verifyOtp(phone: string, code: string): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>("/auth/phone/verify", {
    phone,
    code,
    channel: "web",
  });
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

// Classical registration — verifies the WhatsApp OTP and creates the account
// with name/surname/password in one call. Returns a full session.
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

export async function loginWithGoogle(idToken: string): Promise<AnyAuthResult> {
  const { data } = await api.post<AnyAuthResult>("/auth/google", { idToken, channel: "web" });
  return data;
}

export async function loginWithApple(identityToken: string): Promise<AnyAuthResult> {
  const { data } = await api.post<AnyAuthResult>("/auth/apple", { identityToken, channel: "web" });
  return data;
}

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export async function loginWithTelegram(payload: TelegramAuthData): Promise<AnyAuthResult> {
  const { data } = await api.post<AnyAuthResult>("/auth/telegram", { ...payload, channel: "web" });
  return data;
}

export async function initTelegramBotLogin(): Promise<{
  token: string;
  deepLink: string;
  expiresInSec: number;
}> {
  const { data } = await api.post<{ token: string; deepLink: string; expiresInSec: number }>(
    "/auth/telegram/bot-login/init",
  );
  return data;
}

export async function getTelegramBotLoginStatus(
  token: string,
): Promise<{ status: "waiting" | "done" | "expired" | "not_found" }> {
  const { data } = await api.get<{ status: "waiting" | "done" | "expired" }>(
    "/auth/telegram/bot-login/status",
    { params: { token } },
  );
  return data;
}

export async function claimTelegramBotLogin(token: string): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>("/auth/telegram/bot-login/claim", {
    token,
    channel: "web",
  });
  return data;
}

// Mini App auto-login — sends the raw initData string (HMAC-verified by backend).
export async function loginWithTelegramMiniApp(initData: string): Promise<AnyAuthResult> {
  const { data } = await api.post<AnyAuthResult>("/auth/telegram", { initData, channel: "web" });
  return data;
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
  language?: "ru" | "kg";
  bio?: string;
  termsAccepted?: true;
}): Promise<SelfUser> {
  const { data } = await api.patch<SelfUser>("/users/me", patch);
  return data;
}

export async function setPassword(newPassword: string, currentPassword?: string): Promise<void> {
  await api.patch("/users/me/password", {
    newPassword,
    ...(currentPassword ? { currentPassword } : {}),
  });
}

// Reset the password after proving phone ownership with a fresh WhatsApp OTP.
// The backend requires {phone, code, newPassword} — the code is consumed single-use.
export async function resetPassword(
  phone: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await api.post("/auth/phone/reset-password", { phone, code, newPassword, channel: "web" });
}

// Confirms a phone add inside the Telegram Mini App: the user shares their
// verified contact (signed payload) — no code round-trip. This is the secure
// TMA path and stays as-is; the manual web path uses sendOtp (WhatsApp).
export async function confirmPhoneFromTelegram(response: string): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>("/users/me/phone/from-telegram", { response });
  return data;
}

export async function confirmPhoneAdd(newPhone: string, code: string): Promise<AuthResult> {
  const { data } = await api.patch<AuthResult>("/users/me/phone/confirm", {
    newPhone,
    code,
    channel: "web",
  });
  return data;
}
