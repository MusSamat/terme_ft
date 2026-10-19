"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAdmins, createAdmin, type AdminMember } from "@/lib/api/admin";
import { useAdminAuth } from "@/store/admin-auth";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { Plus, X, UserCog, Calendar } from "lucide-react";
import { AdminQueryError, adminErrorMessage } from "@/components/admin/admin-query-error";
import { toastSuccess } from "@/components/layout/quick-toast";

function fmt(iso?: string | null): string {
  if (!iso) return "Никогда";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAdminsPage() {
  const qc = useQueryClient();
  // TZ §6.3/§17.1 — creating administrators is superadmin-only. Gate the UI so a
  // regular admin doesn't see an action the backend would 403 anyway.
  const isSuperadmin = useAdminAuth((s) => s.admin?.role) === "superadmin";
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "superadmin">("admin");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: listAdmins,
    staleTime: 60_000,
  });

  const admins: AdminMember[] = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => createAdmin({ email, name, password, role }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "admins"] });
      setModalOpen(false);
      setEmail("");
      setName("");
      setPassword("");
      setRole("admin");
      setFormError("");
      toastSuccess("Администратор создан");
    },
    onError: (err) => setFormError(adminErrorMessage(err)),
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-disp font-extrabold text-ink-900">Администраторы</h1>
          <p className="text-[13px] text-ink-500">Управление командой (только суперадмин)</p>
        </div>
        {isSuperadmin && (
          <Button
            type="button"
            variant="invert"
            onClick={() => {
              setModalOpen(true);
              setFormError("");
            }}
          >
            <Plus className="h-4 w-4" />
            Добавить
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : isError ? (
        <AdminQueryError error={error} onRetry={() => void refetch()} />
      ) : admins.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center">
          <UserCog className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <p className="font-bold text-ink-600">Нет администраторов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {admins.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-card"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-200 text-[14px] font-bold text-ink-700">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink-900">{a.name}</p>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold",
                        a.role === "superadmin"
                          ? "bg-accent-100 text-accent-700"
                          : "bg-ink-100 text-ink-600",
                      )}
                    >
                      {a.role}
                    </span>
                    {!a.isActive && (
                      <span className="rounded bg-danger-100 px-1.5 py-0.5 text-[10px] font-bold text-danger-700">
                        неактивен
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-ink-500">{a.email}</p>
                </div>
              </div>
              <div className="hidden items-center gap-1.5 text-[12px] text-ink-400 sm:flex">
                <Calendar className="h-3.5 w-3.5" />
                Последний вход: {fmt(a.lastLoginAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create admin modal — superadmin only */}
      {modalOpen && isSuperadmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[18px] font-disp font-extrabold text-ink-900">Новый администратор</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1 hover:bg-ink-100"
              >
                <X className="h-5 w-5 text-ink-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 px-4 py-3 text-[13px] outline-none focus:border-ink-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
                  Имя *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 px-4 py-3 text-[13px] outline-none focus:border-ink-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
                  Пароль *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 px-4 py-3 text-[13px] outline-none focus:border-ink-400"
                  placeholder="Минимум 12 символов"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
                  Роль
                </label>
                <div className="flex gap-2">
                  {(["admin", "superadmin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-colors",
                        role === r
                          ? r === "superadmin"
                            ? "bg-accent-500 text-accent-ink"
                            : "bg-ink-900 text-white"
                          : "border border-ink-200 text-ink-600 hover:bg-ink-50",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-3 text-[12px] text-ink-400">
              Это временный пароль: при первом входе администратор обязан его сменить.
            </p>

            {formError && (
              <p className="mt-3 rounded-xl bg-danger-50 px-4 py-3 text-[13px] text-danger-700">
                {formError}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setModalOpen(false)}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="invert"
                size="lg"
                onClick={() => createMut.mutate()}
                disabled={!email.trim() || name.trim().length < 2 || password.length < 12 || createMut.isPending}
                className="flex-1"
              >
                {createMut.isPending ? "Создаём…" : "Создать"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
