"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listAuditLog, type AuditLogItem } from "@/lib/api/admin";
import { useAdminAuth } from "@/store/admin-auth";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminQueryError } from "@/components/admin/admin-query-error";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Keys mirror the backend `writeAdminAction` action names.
const ACTIONS: Record<string, { label: string; cls: string }> = {
  verify_driver:        { label: "Одобрил водителя",      cls: "bg-brand-50 text-brand-700" },
  reject_driver:        { label: "Отклонил водителя",     cls: "bg-danger-50 text-danger-700" },
  request_driver_docs:  { label: "Запросил документы",    cls: "bg-ink-100 text-ink-700" },
  block_user:           { label: "Заблокировал",          cls: "bg-danger-50 text-danger-700" },
  unblock_user:         { label: "Разблокировал",         cls: "bg-brand-50 text-brand-700" },
  force_cancel_trip:    { label: "Отменил поездку",       cls: "bg-danger-50 text-danger-700" },
  force_cancel_request: { label: "Отменил заявку",        cls: "bg-danger-50 text-danger-700" },
  resolve_complaint:    { label: "Решение по жалобе",     cls: "bg-brand-50 text-brand-700" },
  update_city:          { label: "Изменил место",         cls: "bg-ink-100 text-ink-700" },
  create_admin:         { label: "Создал администратора", cls: "bg-ink-100 text-ink-700" },
  create_car_brand:     { label: "Добавил марку",         cls: "bg-ink-100 text-ink-700" },
  update_car_brand:     { label: "Изменил марку",         cls: "bg-ink-100 text-ink-700" },
  delete_car_brand:     { label: "Удалил марку",          cls: "bg-danger-50 text-danger-700" },
  create_car_model:     { label: "Добавил модель",        cls: "bg-ink-100 text-ink-700" },
  update_car_model:     { label: "Изменил модель",        cls: "bg-ink-100 text-ink-700" },
  delete_car_model:     { label: "Удалил модель",         cls: "bg-danger-50 text-danger-700" },
  create_car_color:     { label: "Добавил цвет",          cls: "bg-ink-100 text-ink-700" },
  update_car_color:     { label: "Изменил цвет",          cls: "bg-ink-100 text-ink-700" },
  delete_car_color:     { label: "Удалил цвет",           cls: "bg-danger-50 text-danger-700" },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTIONS[action];
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", cfg?.cls ?? "bg-ink-100 text-ink-600")}>
      {cfg?.label ?? action.replace(/_/g, " ")}
    </span>
  );
}

// Where an audit target can be opened in the panel (driver targets carry the user id).
function targetHref(type: string | null, id: string): string | null {
  if (type === "user" || type === "driver") return `/admin/users/${id}`;
  if (type === "complaint") return `/admin/complaints/${id}`;
  if (type === "trip") return `/admin/trips?focus=${id}`;
  if (type === "passenger_request") return `/admin/requests?focus=${id}`;
  return null;
}

const LIMIT = 25;

export default function AdminAuditLogPage() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === "superadmin";
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors[cursors.length - 1];
  const [action, setAction] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "audit-log", action, cursor],
    queryFn: () => listAuditLog({ action: action || undefined, cursor, limit: LIMIT }),
    staleTime: 30_000,
  });

  const items: AuditLogItem[] = data?.data ?? [];
  const hasNext = !!data?.nextCursor;
  const hasPrev = cursors.length > 0;

  function nextPage() {
    if (data?.nextCursor) setCursors((prev) => [...prev, data.nextCursor!]);
  }
  function prevPage() {
    setCursors((prev) => prev.slice(0, -1));
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-disp font-extrabold text-ink-900">Журнал действий</h1>
        <p className="text-[13px] text-ink-500">
          {isSuperAdmin ? "Все действия администраторов" : "Ваши действия"}
        </p>
      </div>

      <select
        value={action}
        onChange={(e) => { setAction(e.target.value); setCursors([]); }}
        className="mb-4 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-[13px] outline-none focus:border-ink-400"
      >
        <option value="">Все действия</option>
        {Object.entries(ACTIONS).map(([key, cfg]) => (
          <option key={key} value={key}>{cfg.label}</option>
        ))}
      </select>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : isError ? (
        <AdminQueryError error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <p className="font-bold text-ink-600">Нет записей</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl bg-white shadow-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100">
                  {["Время", "Администратор", "Действие", "Объект", "IP"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-ink-50">
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-ink-500">
                      {fmt(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-bold text-ink-900">{item.admin.name}</p>
                      <p className="text-[11px] text-ink-400">{item.admin.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={item.action} />
                      {typeof item.details?.reason === "string" && (
                        <p className="mt-1 max-w-[320px] text-[11px] text-ink-500">{item.details.reason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-ink-600">
                      {item.targetType && (
                        <span className="mr-1 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">
                          {item.targetType}
                        </span>
                      )}
                      {item.targetId ? (
                        targetHref(item.targetType, item.targetId) ? (
                          <Link href={targetHref(item.targetType, item.targetId)!} className="font-mono text-[11px] hover:underline">
                            {item.targetId.slice(0, 8)}…
                          </Link>
                        ) : (
                          <span className="font-mono text-[11px]">{item.targetId.slice(0, 8)}…</span>
                        )
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-400">
                      {item.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[13px] text-ink-500">
              Показано {items.length} записей
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={prevPage}
                disabled={!hasPrev}
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </Button>
              <Button
                variant="outline"
                onClick={nextPage}
                disabled={!hasNext}
              >
                Далее
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
