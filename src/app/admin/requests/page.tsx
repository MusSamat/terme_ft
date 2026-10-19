"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminForceCancelRequest,
  getAdminRequest,
  listAdminRequests,
  type AdminRequestItem,
  type AdminRequestDetail,
} from "@/lib/api/admin";
import { Button, StatusBadge, type StatusBadgeStatus } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { Inbox, ChevronLeft, ChevronRight, X, Link2 } from "lucide-react";
import { AdminQueryError, adminErrorMessage } from "@/components/admin/admin-query-error";
import { toastSuccess } from "@/components/layout/quick-toast";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type StatusTab = "open" | "cancelled" | "closed" | "expired" | "all";
const TABS: { key: StatusTab; label: string }[] = [
  { key: "open", label: "Открытые" },
  { key: "cancelled", label: "Отменённые" },
  { key: "closed", label: "Закрытые" },
  { key: "expired", label: "Истёкшие" },
  { key: "all", label: "Все" },
];
const STATUS_BADGE: Record<string, { tone: StatusBadgeStatus; label: string }> = {
  open: { tone: "active", label: "Открыта" },
  cancelled: { tone: "rejected", label: "Отменена" },
  closed: { tone: "completed", label: "Закрыта" },
  expired: { tone: "completed", label: "Истекла" },
};
const REASONS = ["Спам / дубликат", "Нарушение правил", "Некорректный маршрут", "Мошенничество", "Другое"];
const LIMIT = 20;

export default function AdminRequestsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusTab>("open");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors[cursors.length - 1];
  const [openId, setOpenId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminRequestItem | null>(null);
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");

  const listQuery = useQuery({
    queryKey: ["admin", "requests", status, q, cursor],
    queryFn: () => listAdminRequests({ status: status === "all" ? undefined : status, q: q || undefined, cursor, limit: LIMIT }),
    staleTime: 30_000,
  });
  const detailQuery = useQuery({
    queryKey: ["admin", "request", openId],
    queryFn: () => getAdminRequest(openId!),
    enabled: !!openId,
    staleTime: 30_000,
  });

  // Deep-link: /admin/requests?focus=<id> shows that request in a card at the
  // top (fetched by id, so it works even if it's not on the current page).
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");
  const focusQuery = useQuery({
    queryKey: ["admin", "request", focus],
    queryFn: () => getAdminRequest(focus!),
    enabled: !!focus,
    staleTime: 30_000,
  });
  useEffect(() => { if (focus) setOpenId(null); }, [focus]);

  const effectiveReason = reason === "Другое" ? custom.trim() : reason;
  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminForceCancelRequest(id, reason),
    onSuccess: () => {
      setCancelTarget(null); setReason(""); setCustom("");
      void qc.invalidateQueries({ queryKey: ["admin", "requests"] });
      void qc.invalidateQueries({ queryKey: ["admin", "request"] });
      void qc.invalidateQueries({ queryKey: ["admin", "user"] });
      void qc.invalidateQueries({ queryKey: ["admin", "kpi"] });
      toastSuccess("Заявка отменена, пассажир уведомлён");
    },
  });

  const requests = listQuery.data?.data ?? [];
  const hasNext = !!listQuery.data?.nextCursor;
  const hasPrev = cursors.length > 0;

  function changeStatus(s: StatusTab) { setStatus(s); setCursors([]); setOpenId(null); }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-5">
        <h1 className="text-[24px] font-disp font-extrabold text-ink-900">Заявки пассажиров</h1>
        <p className="text-[13px] text-ink-500">Просмотр заявок, предложения водителей, отмена с сообщением пассажиру</p>
      </div>

      {/* Deep-linked request (from a user profile) — shown up top. */}
      {focus && focusQuery.data && (
        <div className="mb-5 rounded-2xl bg-white p-4 shadow-card ring-2 ring-ink-900">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-ink-400" />
              <p className="font-bold text-ink-900">{focusQuery.data.originCity} → {focusQuery.data.destinationCity}</p>
              <StatusBadge status={STATUS_BADGE[focusQuery.data.status]?.tone ?? focusQuery.data.status} label={STATUS_BADGE[focusQuery.data.status]?.label} />
            </div>
            <div className="flex items-center gap-2">
              {focusQuery.data.status === "open" && (
                <Button variant="danger" size="sm" onClick={() => { setCancelTarget(focusQuery.data as AdminRequestItem); setReason(""); setCustom(""); }}>Отменить</Button>
              )}
              <span className="text-[12px] text-ink-400">{fmtDate(focusQuery.data.departureDate)} · {focusQuery.data.passenger.name}</span>
            </div>
          </div>
          <RequestDetailBody detail={focusQuery.data} />
        </div>
      )}

      {/* Tabs + search */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl bg-ink-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeStatus(tab.key)}
              className={cn("rounded-lg px-3.5 py-1.5 text-[13px] font-bold transition", status === tab.key ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700")}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setCursors([]); setQ(qInput.trim()); }}
          className="ml-auto flex items-center gap-2"
        >
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Город или имя пассажира"
            className="h-9 w-56 rounded-xl border border-ink-200 px-3 text-[13px] outline-none focus:border-ink-400"
          />
          <Button type="submit" variant="invert" size="sm">Поиск</Button>
        </form>
      </div>

      {listQuery.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />)}</div>
      ) : listQuery.isError ? (
        <AdminQueryError error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : requests.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <p className="font-bold text-ink-500">Заявки не найдены</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => {
            const expanded = openId === r.id;
            return (
              <div key={r.id} className={cn("rounded-2xl bg-white shadow-card transition-shadow", expanded && "ring-2 ring-ink-900")}>
                <div className="flex cursor-pointer items-center justify-between p-4" onClick={() => setOpenId(expanded ? null : r.id)}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-900">{r.originCity} → {r.destinationCity}</p>
                    <p className="text-[12px] text-ink-500">
                      {fmtDate(r.departureDate)} · <span className="font-semibold text-ink-700">{r.passenger.name}</span> · {r.seatsNeeded} мест
                      {r.offersCount > 0 && <span className="ml-1.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">{r.offersCount} предл.</span>}
                    </p>
                  </div>
                  <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                    <StatusBadge status={STATUS_BADGE[r.status]?.tone ?? r.status} label={STATUS_BADGE[r.status]?.label} />
                    {r.status === "open" && (
                      <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setCancelTarget(r); setReason(""); setCustom(""); }}>Отменить</Button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-ink-100 px-4 py-3">
                    {detailQuery.isLoading ? (
                      <div className="py-4 text-center text-[13px] text-ink-400">Загрузка…</div>
                    ) : detailQuery.data ? (
                      <RequestDetailBody detail={detailQuery.data} />
                    ) : (
                      <p className="py-4 text-center text-[13px] text-ink-400">Не удалось загрузить</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(hasPrev || hasNext) && (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" disabled={!hasPrev} onClick={() => setCursors((p) => p.slice(0, -1))}><ChevronLeft className="h-4 w-4" /> Назад</Button>
          <Button variant="outline" disabled={!hasNext} onClick={() => { if (listQuery.data?.nextCursor) setCursors((p) => [...p, listQuery.data!.nextCursor!]); }}>Вперёд <ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Cancel-with-message modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4" onClick={() => { cancelMut.reset(); setCancelTarget(null); }}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[19px] font-extrabold text-ink-900">Отменить заявку</h2>
              <button type="button" onClick={() => setCancelTarget(null)} className="rounded-full p-1 text-ink-400 hover:bg-ink-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-4 text-[13px] text-ink-500">
              {cancelTarget.originCity} → {cancelTarget.destinationCity} · {cancelTarget.passenger.name}. Пассажир получит сообщение с причиной.
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {REASONS.map((rr) => (
                <button key={rr} type="button" onClick={() => setReason(rr)} className={cn("rounded-full border-2 px-3 py-1.5 text-[13px] font-bold transition", reason === rr ? "border-danger-500 bg-danger-50 text-danger-700" : "border-ink-200 text-ink-600 hover:bg-ink-50")}>{rr}</button>
              ))}
            </div>
            {reason === "Другое" && (
              <textarea value={custom} onChange={(e) => setCustom(e.target.value)} rows={3} maxLength={500} placeholder="Сообщение пассажиру…" className="mb-3 w-full rounded-xl border-2 border-ink-200 px-3 py-2 text-[14px] outline-none focus:border-danger-400" />
            )}
            {cancelMut.isError && <p className="mb-2 text-[13px] font-semibold text-danger-600">{adminErrorMessage(cancelMut.error)}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelTarget(null)}>Отмена</Button>
              <Button variant="danger" className="flex-[2]" disabled={effectiveReason.length < 3 || cancelMut.isPending} onClick={() => cancelMut.mutate({ id: cancelTarget.id, reason: effectiveReason })}>
                {cancelMut.isPending ? "Отмена…" : "Отменить и уведомить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestDetailBody({ detail }: { detail: AdminRequestDetail }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
        <Link href={`/admin/users/${detail.passenger.id}`} className="font-semibold text-ink-800 hover:underline">{detail.passenger.name} →</Link>
        <span className="text-ink-500">Телефон: <span className="font-semibold text-ink-800">{detail.passenger.phone}</span></span>
        {detail.flexible && <span className="text-ink-500">± гибкая дата</span>}
        {detail.comment && <span className="text-ink-500">«{detail.comment}»</span>}
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">Предложения водителей ({detail.offers.length})</p>
        {detail.offers.length === 0 ? (
          <p className="text-[13px] text-ink-400">Пока нет предложений</p>
        ) : (
          <div className="space-y-1.5">
            {detail.offers.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-[13px]">
                <span className="font-semibold text-ink-800">{o.driverName}</span>
                <span className="flex items-center gap-3 text-ink-500">
                  <span className="font-bold text-sky-600">{o.price} сом</span>
                  <span>{fmtDateTime(o.departureTime)}</span>
                  <StatusBadge status={o.status === "accepted" ? "active" : o.status === "declined" ? "rejected" : "pending"} label={o.status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
