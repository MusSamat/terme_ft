import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiError, TokenPair } from "./types";
import { detectRuntime } from "@/lib/detect-runtime";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  // Send/receive the HttpOnly refresh-token cookie (TZ §5/§26.1).
  withCredentials: true,
});

// The refresh token lives in an HttpOnly cookie the server sets — it is NOT
// readable from JS. We keep only a non-sensitive flag so the app knows whether
// to attempt a silent refresh on load.
const SESSION_HINT = "terme_session";

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

export const markSessionHint = () => {
  try {
    localStorage.setItem(SESSION_HINT, "1");
  } catch {}
};
export const clearSessionHint = () => {
  try {
    localStorage.removeItem(SESSION_HINT);
  } catch {}
};
export const hasSessionHint = (): boolean => {
  try {
    return typeof window !== "undefined" && localStorage.getItem(SESSION_HINT) === "1";
  } catch {
    return false;
  }
};

let _onTokenRefreshed: (() => void) | null = null;
export function onTokenRefreshed(cb: () => void) {
  _onTokenRefreshed = cb;
}

export const setTokens = (pair: Pick<TokenPair, "accessToken" | "refreshToken">) => {
  // refreshToken (if present) is ignored on web — the server delivers it as a
  // cookie. We only keep the access token in memory + flag the session.
  if (pair.accessToken) {
    setAccessToken(pair.accessToken);
    markSessionHint();
  }
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  // Platform attribution for presence/analytics: Telegram Mini App → "mini",
  // plain browser → "web". Native mobile (Flutter) sends its own value.
  config.headers["X-Client-Platform"] = detectRuntime() === "telegram" ? "mini" : "web";
  // The instance defaults to application/json. For FormData (avatar, car photo,
  // driver docs, complaint photos) that default must be dropped so axios/the
  // browser generate `multipart/form-data; boundary=…` — otherwise multer sees
  // no file and returns missing_file. One place covers every upload endpoint.
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    // No token in the body — the HttpOnly cookie carries the refresh token.
    refreshPromise = axios
      .post<TokenPair>(`${baseURL}/auth/refresh`, { channel: "web" }, { withCredentials: true })
      .then((r) => {
        if (!r.data.accessToken) throw new Error("NO_ACCESS_IN_REFRESH");
        setTokens({ accessToken: r.data.accessToken });
        _onTokenRefreshed?.();
        return r.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    if (
      status === 401 &&
      code === "TOKEN_EXPIRED" &&
      original &&
      !original._retry &&
      !isRefreshCall
    ) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      } catch {
        setAccessToken(null);
        clearSessionHint();
        if (typeof window !== "undefined") window.location.assign("/auth/login");
      }
    }
    return Promise.reject(error);
  },
);

export function extractError(e: unknown): ApiError["error"] {
  if (axios.isAxiosError<ApiError>(e)) {
    if (e.response?.data?.error) return e.response.data.error;
    // Network failure (no response) while the browser knows it is offline —
    // resolved to api_errors.network_offline by friendlyError.
    if (!e.response && typeof navigator !== "undefined" && !navigator.onLine) {
      return {
        code: "NETWORK_OFFLINE",
        message: "Нет соединения с интернетом. Проверьте сеть и попробуйте снова.",
        details: { reason: "network_offline" },
      };
    }
  }
  return { code: "INTERNAL_ERROR", message: "Что-то пошло не так" };
}
