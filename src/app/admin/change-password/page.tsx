"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/store/admin-auth";
import { adminChangePassword } from "@/lib/api/admin";
import { Button } from "@/components/ui";
import type { AxiosError } from "axios";

interface ApiErr { error?: { code?: string; details?: { reason?: string } } }

const MIN_LENGTH = 12;

export default function AdminChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const clearSession = useAdminAuth((s) => s.clearSession);
  const forced = useAdminAuth((s) => !!s.admin?.mustChangePassword);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next.length < MIN_LENGTH) return setError(`Новый пароль — не короче ${MIN_LENGTH} символов`);
    if (next !== confirm) return setError("Пароли не совпадают");
    if (next === current) return setError("Новый пароль должен отличаться от текущего");

    setLoading(true);
    try {
      await adminChangePassword(current, next);
      // The change revokes every admin refresh token, so start a fresh session.
      clearSession();
      router.replace("/admin/login?changed=1");
    } catch (err: unknown) {
      const body = (err as AxiosError<ApiErr>)?.response?.data?.error;
      if (body?.details?.reason === "admin_credentials") setError("Неверный текущий пароль");
      else if (body?.code === "VALIDATION_ERROR") setError(`Новый пароль — не короче ${MIN_LENGTH} символов`);
      else if (body?.code === "RATE_LIMITED") setError("Слишком много попыток — подождите минуту");
      else setError("Не удалось сменить пароль. Попробуйте снова.");
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-xl border border-ink-200 px-4 py-3 text-[14px] outline-none focus:border-ink-500";
  const label = "mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500";

  return (
    <div className="w-full max-w-[400px] rounded-2xl bg-white p-8 shadow-lift">
      <div className="mb-6 text-center">
        <p className="text-[18px] font-extrabold text-ink-900">Смена пароля</p>
        <p className="mt-1 text-[13px] text-ink-500">
          {forced
            ? "Временный пароль нужно заменить. Затем войдите с новым паролем."
            : "Задайте новый пароль, затем войдите с ним заново."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={label}>Текущий пароль</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            className={field}
          />
        </div>
        <div>
          <label className={label}>Новый пароль</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={MIN_LENGTH}
            autoComplete="new-password"
            className={field}
          />
          <p className="mt-1 text-[12px] text-ink-400">Не короче {MIN_LENGTH} символов</p>
        </div>
        <div>
          <label className={label}>Повторите новый пароль</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className={field}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-danger-50 px-4 py-3 text-[13px] text-danger-700">{error}</p>
        )}

        <Button type="submit" variant="invert" size="lg" disabled={loading} className="w-full">
          {loading ? "Сохраняем…" : "Сменить пароль"}
        </Button>
        {forced ? (
          <button
            type="button"
            onClick={() => {
              clearSession();
              router.replace("/admin/login");
            }}
            className="text-[13px] font-semibold text-ink-500 hover:text-ink-800"
          >
            Выйти
          </button>
        ) : (
          <Link
            href="/admin/dashboard"
            className="text-center text-[13px] font-semibold text-ink-500 hover:text-ink-800"
          >
            Вернуться в панель
          </Link>
        )}
      </form>
    </div>
  );
}
