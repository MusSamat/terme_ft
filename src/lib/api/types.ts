import type { components } from "./schema.gen";

export type Role = "passenger" | "driver" | "admin" | "superadmin";
export type Language = "ru" | "kg";

export type TokenPair = components["schemas"]["TokenPair"];
export type SelfUser = components["schemas"]["SelfUser"];
// The spec omits loyaltyTier on PublicUser; the API returns it.
export type PublicUser = components["schemas"]["PublicUser"] & { loyaltyTier?: string };

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
    avatarUrl: string | null;
    roles: Role[];
    language: Language;
    phoneVerified: boolean;
    telegramLinked: boolean;
    termsAcceptedAt: string | null;
  };
}

export interface CheckPhoneResult {
  exists: boolean;
  hasPassword: boolean;
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
  | "OTP_BUDGET_EXCEEDED"
  | "CONTACT_LIMIT"
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
  // Backend cursor envelopes are camelCase (sliceAndNext → nextCursor).
  nextCursor: string | null;
}

/** Engagement fields returned on trip & passenger-request DTOs. */
export interface EngagementFields {
  /** Whether the current viewer liked this listing. */
  liked: boolean;
  /** Non-null only when the viewer is the listing's creator. */
  metrics: { views: number; likes: number; contacts?: number } | null;
}
