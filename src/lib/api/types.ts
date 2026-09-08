import type { components } from "./schema.gen";

export type Role = "passenger" | "driver" | "admin" | "superadmin";
export type Language = "ru" | "kg";
export type AuthProvider = "telegram" | "google" | "apple" | "phone";

export type TokenPair = components["schemas"]["TokenPair"];
export type SelfUser = components["schemas"]["SelfUser"];
export type PublicUser = components["schemas"]["PublicUser"];

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  kind: "full";
  user: {
    id: string;
    phone: string;
    name: string;
    roles: Role[];
    language: Language;
    phoneVerified: boolean;
    providers: AuthProvider[];
  };
}

export interface ProvisionalAuthResult {
  kind: "provisional";
  provisionalToken: string;
  provisionalTokenExpiresIn: number;
  requiresPhoneVerification: true;
  hintPhone: string | null;
  hintName: string | null;
  user: {
    id: string;
    provider: AuthProvider;
  };
}

export type AnyAuthResult = AuthResult | ProvisionalAuthResult;

export function isFullAuthResult(r: AnyAuthResult): r is AuthResult {
  return r.kind === "full";
}

export interface CheckPhoneResult {
  exists: boolean;
  hasPassword: boolean;
  hasTelegram: boolean;
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "TOKEN_EXPIRED"
  | "TOKEN_REUSE_DETECTED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SEATS_NOT_AVAILABLE"
  | "BOOKING_ALREADY_EXISTS"
  | "TRIP_NOT_ACTIVE"
  | "RATE_LIMITED"
  | "OTP_EXPIRED"
  | "OTP_WRONG"
  | "OTP_TOO_MANY_ATTEMPTS"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "WHATSAPP_WINDOW_EXPIRED"
  // Client-side synthetic code: request failed without a response while
  // navigator.onLine === false (never sent by the backend).
  | "NETWORK_OFFLINE";

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    message_kg?: string;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}

export interface Paginated<T> {
  data: T[];
  next_cursor: string | null;
}

/** Engagement fields returned on trip & passenger-request DTOs. */
export interface EngagementFields {
  /** Whether the current viewer liked this listing. */
  liked: boolean;
  /** Non-null only when the viewer is the listing's creator. */
  metrics: { views: number; likes: number; contacts?: number } | null;
}
