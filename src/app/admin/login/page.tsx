"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/store/admin-auth";
import { adminLogin } from "@/lib/api/admin";
import { adminGuardRedirect, ADMIN_HOME, ADMIN_LOGIN } from "@/lib/admin-guard";
import { Button } from "@/components/ui";
import type { AxiosError } from "axios";

interface ApiErr { error?: { code?: string; message?: string; details?: { reason?: string } } }

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setSession } = useAdminAuth();
  const router = useRouter();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("changed") === "1") setNotice("Пароль изменён — войдите с новым паролем");
    else if (q.get("totp") === "off") setNotice("Двухфакторная защита отключена — войдите снова");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await adminLogin(email, password, totp || undefined);
      setSession({
        accessToken: result.accessToken,
        admin: result.admin,
        accessTokenExpiresIn: result.accessTokenExpiresIn,
        refreshToken: result.refreshToken,
      });
      // Temp password first, then 2FA enrolment (if required), then the panel.
      router.replace(
        adminGuardRedirect({
          pathname: ADMIN_LOGIN,
          hasToken: true,
          mustChangePassword: result.admin.mustChangePassword,
          totpEnrollmentRequired: result.admin.totpEnrollmentRequired,
        }) ?? ADMIN_HOME,
      );
    } catch (err: unknown) {
      const body = (err as AxiosError<ApiErr>)?.response?.data?.error;
      const code = body?.code;
      const reason = (body?.details as { reason?: string } | undefined)?.reason;
      if (reason === "admin_credentials") {
        // The backend answers the same for a wrong password and a wrong or
        // missing 2FA code — it never confirms which one was wrong.
        setError("Неверный email, пароль или код 2FA");
      } else if (code === "VALIDATION_ERROR") {
        setError("Проверьте формат: email, пароль не короче 8 символов, код 2FA — 6 цифр");
      } else if (code === "RATE_LIMITED") {
        setError("Слишком много попыток — вход временно заблокирован, попробуйте через 15 минут");
      } else {
        setError(`Ошибка входа. Попробуйте снова${reason ? ` (${reason})` : ""}.`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] rounded-2xl bg-white p-8 shadow-lift">
      <div className="mb-6 text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <span className="text-[22px] font-extrabold text-ink-900">Terme</span>
          <span className="rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold text-accent-ink">
            ADMIN
          </span>
        </div>
        <p className="text-[13px] text-ink-500">Панель администратора</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-[14px] outline-none focus:border-ink-500"
            placeholder="admin@terme.kg"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
            Пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-[14px] outline-none focus:border-ink-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
            Код 2FA
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={totp}
            onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border border-ink-200 px-4 py-3 text-[14px] tracking-widest outline-none focus:border-ink-500"
            placeholder="000000"
            maxLength={6}
          />
          <p className="mt-1 text-[12px] text-ink-400">
            Оставьте пустым, если двухфакторная защита ещё не настроена
          </p>
        </div>

        {notice && !error && (
          <p className="rounded-xl bg-ink-50 px-4 py-3 text-[13px] text-ink-700">{notice}</p>
        )}

        {error && (
          <p className="rounded-xl bg-danger-50 px-4 py-3 text-[13px] text-danger-700">{error}</p>
        )}

        <Button type="submit" variant="invert" size="lg" disabled={loading} className="w-full">
          {loading ? "Входим…" : "Войти"}
        </Button>
      </form>
    </div>
  );
}
