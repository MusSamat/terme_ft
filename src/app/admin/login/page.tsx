"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/store/admin-auth";
import { adminLogin } from "@/lib/api/admin";
import { Button } from "@/components/ui";
import type { AxiosError } from "axios";

interface ApiErr { error?: { code?: string; message?: string; details?: { reason?: string } } }

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setSession } = useAdminAuth();
  const router = useRouter();

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
      // Temp password must be replaced before entering the panel.
      router.replace(result.admin.mustChangePassword ? "/admin/change-password" : "/admin/dashboard");
    } catch (err: unknown) {
      const body = (err as AxiosError<ApiErr>)?.response?.data?.error;
      const code = body?.code;
      const reason = (body?.details as { reason?: string } | undefined)?.reason;
      if (reason === "totp_required") {
        setShowTotp(true);
        setError("Введите код из приложения аутентификатора");
      } else if (reason === "totp_invalid") {
        setShowTotp(true);
        setError("Неверный код аутентификатора");
      } else if (reason === "admin_credentials") {
        setError("Неверный email или пароль");
      } else if (code === "VALIDATION_ERROR") {
        setError("Проверьте формат: email и пароль не короче 8 символов");
      } else if (code === "RATE_LIMITED") {
        setError("Слишком много попыток — подождите минуту");
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

        {showTotp && (
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
              Код 2FA
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-ink-200 px-4 py-3 text-[14px] tracking-widest outline-none focus:border-ink-500"
              placeholder="000000"
              maxLength={6}
            />
          </div>
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
