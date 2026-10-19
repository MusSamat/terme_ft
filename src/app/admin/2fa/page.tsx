"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AxiosError } from "axios";
import { useAdminAuth } from "@/store/admin-auth";
import { adminLogout, adminTotpConfirm, adminTotpDisable, adminTotpSetup } from "@/lib/api/admin";
import { Button } from "@/components/ui";
import { toastSuccess } from "@/components/layout/quick-toast";

interface ApiErr { error?: { code?: string; details?: { reason?: string } } }
type Step = "intro" | "secret" | "code" | "done";

const reasonOf = (err: unknown) => (err as AxiosError<ApiErr>)?.response?.data?.error?.details?.reason;
const groupBy4 = (s: string) => s.replace(/(.{4})(?=.)/g, "$1 ");
const field =
  "w-full rounded-xl border border-ink-200 px-4 py-3 text-center text-[18px] tracking-[0.4em] outline-none focus:border-ink-500";
const label = "mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500";
const mono = "break-all rounded-xl bg-ink-50 px-3 py-2 font-mono text-[13px] text-ink-800";

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className={field}
      placeholder="000000"
      maxLength={6}
      autoFocus
    />
  );
}

function copy(text: string) {
  void navigator.clipboard?.writeText(text).then(() => toastSuccess("Скопировано"));
}

export default function AdminTwoFactorPage() {
  const router = useRouter();
  const { admin, setSession, clearSession, updateAdmin } = useAdminAuth();
  const forced = !!admin?.totpEnrollmentRequired;
  const [step, setStep] = useState<Step>("intro");
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signOut(query = "") {
    await adminLogout().catch(() => undefined);
    clearSession();
    router.replace(`/admin/login${query}`);
  }

  async function run(fn: () => Promise<void>, onError: (reason?: string) => string) {
    setError("");
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(onError(reasonOf(err)));
    } finally {
      setLoading(false);
    }
  }

  const start = () =>
    run(
      async () => {
        setSetup(await adminTotpSetup());
        setCode("");
        setStep("secret");
      },
      (reason) => {
        if (reason !== "totp_already_enabled") return "Не удалось начать настройку. Попробуйте снова.";
        updateAdmin({ totpEnabled: true, totpEnrollmentRequired: false });
        return "";
      },
    );

  const confirm = () =>
    run(
      async () => {
        const r = await adminTotpConfirm(code);
        setSession({ accessToken: r.accessToken, admin: r.admin, accessTokenExpiresIn: r.accessTokenExpiresIn });
        setStep("done");
      },
      (reason) => {
        if (reason === "totp_invalid") return "Неверный код. Проверьте время на телефоне и введите свежий код.";
        if (reason === "totp_setup_not_started") {
          setStep("intro");
          return "Настройка устарела — начните заново.";
        }
        return "Не удалось подтвердить. Попробуйте снова.";
      },
    );

  const disable = () =>
    run(
      async () => {
        await adminTotpDisable({ code });
        // Disabling revokes every admin session (refresh tokens) — sign in again.
        await signOut("?totp=off");
      },
      (reason) => (reason === "totp_invalid" ? "Неверный код аутентификатора" : "Не удалось отключить. Попробуйте снова."),
    );

  const errorBox = error && (
    <p className="rounded-xl bg-danger-50 px-4 py-3 text-[13px] text-danger-700">{error}</p>
  );
  const back = forced ? (
    <button type="button" onClick={() => void signOut()} className="text-[13px] font-semibold text-ink-500 hover:text-ink-800">
      Выйти
    </button>
  ) : (
    <Link href="/admin/dashboard" className="text-center text-[13px] font-semibold text-ink-500 hover:text-ink-800">
      Вернуться в панель
    </Link>
  );

  const enabled = !!admin?.totpEnabled && step !== "done";

  return (
    <div className="max-h-full w-full max-w-[440px] overflow-y-auto rounded-2xl bg-white p-8 shadow-lift">
      <div className="mb-6 text-center">
        <p className="text-[18px] font-extrabold text-ink-900">Двухфакторная защита</p>
        <p className="mt-1 text-[13px] text-ink-500">
          {enabled ? "Включена: при входе нужен код из приложения." : forced ? "Обязательна для входа в панель." : "Выключена."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {enabled ? (
          <>
            <p className="text-[13px] text-ink-600">
              Чтобы отключить защиту, введите текущий код из приложения. После этого все сеансы
              администратора завершатся — войдите заново.
            </p>
            <div>
              <label className={label}>Код из приложения</label>
              <CodeInput value={code} onChange={setCode} />
            </div>
            {errorBox}
            <Button type="button" variant="dangerSoft" size="lg" className="w-full" disabled={loading || code.length !== 6} onClick={() => void disable()}>
              {loading ? "Отключаем…" : "Отключить"}
            </Button>
            {back}
          </>
        ) : step === "intro" ? (
          <>
            <p className="text-[13px] text-ink-600">
              Помимо пароля, при входе понадобится 6-значный код из приложения-аутентификатора
              (Google Authenticator, Authy и др.). Код меняется каждые 30 секунд — украденного пароля
              станет недостаточно.
            </p>
            <p className="text-[13px] text-ink-600">
              Установите приложение на телефон и нажмите «Начать». После включения другие сеансы
              администратора завершатся.
            </p>
            {errorBox}
            <Button type="button" variant="invert" size="lg" className="w-full" disabled={loading} onClick={() => void start()}>
              {loading ? "Готовим…" : "Начать"}
            </Button>
            {back}
          </>
        ) : step === "secret" && setup ? (
          <>
            <ol className="list-decimal space-y-1 pl-5 text-[13px] text-ink-600">
              <li>Откройте Google Authenticator или Authy и нажмите «+».</li>
              <li>Выберите «Ввести ключ настройки» (Authy: «Enter key manually»).</li>
              <li>Название — любое, например «Terme admin»; тип — «По времени».</li>
              <li>Вставьте ключ ниже и сохраните.</li>
            </ol>
            <div>
              <label className={label}>Ключ</label>
              <p className={`${mono} text-center text-[16px] font-bold tracking-wider`}>{groupBy4(setup.secret)}</p>
              <button type="button" onClick={() => copy(setup.secret)} className="mt-1 text-[12px] font-semibold text-ink-500 hover:text-ink-800">
                Скопировать ключ
              </button>
            </div>
            <div>
              <label className={label}>Ссылка otpauth (для менеджеров паролей)</label>
              <p className={mono}>{setup.otpauthUri}</p>
              <button type="button" onClick={() => copy(setup.otpauthUri)} className="mt-1 text-[12px] font-semibold text-ink-500 hover:text-ink-800">
                Скопировать ссылку
              </button>
            </div>
            <Button type="button" variant="invert" size="lg" className="w-full" onClick={() => setStep("code")}>
              Ключ добавлен — далее
            </Button>
            {back}
          </>
        ) : step === "code" ? (
          <>
            <p className="text-[13px] text-ink-600">Введите 6-значный код, который сейчас показывает приложение.</p>
            <CodeInput value={code} onChange={setCode} />
            {errorBox}
            <Button type="button" variant="invert" size="lg" className="w-full" disabled={loading || code.length !== 6} onClick={() => void confirm()}>
              {loading ? "Проверяем…" : "Подтвердить"}
            </Button>
            <button type="button" onClick={() => setStep("secret")} className="text-[13px] font-semibold text-ink-500 hover:text-ink-800">
              Назад к ключу
            </button>
          </>
        ) : (
          <>
            <p className="rounded-xl bg-brand-50 px-4 py-3 text-[13px] text-brand-800">
              Двухфакторная защита включена. При следующем входе введите код из приложения.
            </p>
            <Button type="button" variant="invert" size="lg" className="w-full" onClick={() => router.replace("/admin/dashboard")}>
              Перейти в панель
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
