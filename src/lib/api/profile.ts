import { api, setTokens } from "./client";
import type { AuthResult, SelfUser } from "./types";

// Phone change: the session authenticates, a WhatsApp code to the NEW number
// proves possession (confirmPhoneChange). Other sessions are revoked.
export async function changePhone(newPhone: string): Promise<{ expiresInSec: number; debug_code?: string }> {
  const { data } = await api.patch<{ expiresInSec: number; debug_code?: string }>("/users/me/phone", {
    newPhone,
  });
  return data;
}

export async function confirmPhoneChange(
  newPhone: string,
  code: string,
): Promise<SelfUser> {
  const { data } = await api.patch<AuthResult>("/users/me/phone/confirm", {
    newPhone,
    code,
    channel: "web",
  });
  setTokens(data);
  return data.user as SelfUser;
}

export async function deleteAccount(): Promise<void> {
  await api.delete("/users/me");
}

export async function exportData(): Promise<Blob> {
  const { data } = await api.get<Blob>("/users/me/export", {
    responseType: "blob",
  });
  return data;
}

export interface DriverStatusView {
  status: "none" | "pending" | "verified" | "rejected" | "docs_requested" | "suspended" | "blocked";
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  requestedDocs: string[];
  car: {
    make: string;
    model: string;
    year: number;
    color: string;
    plate: string;
    seats: number;
    photoUrl: string | null;
  } | null;
}

export async function getDriverStatus(): Promise<DriverStatusView> {
  const { data } = await api.get<DriverStatusView>("/drivers/verification/status");
  return data;
}

export async function uploadCarPhoto(file: File): Promise<{ carPhotoUrl: string }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.patch<{ carPhotoUrl: string }>("/drivers/car-photo", form);
  return data;
}

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append("avatar", file);
  const { data } = await api.post<{ avatarUrl: string }>("/users/avatar", form);
  return data;
}
