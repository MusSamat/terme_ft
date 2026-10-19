"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listAdminComplaints, type ComplaintItem } from "@/lib/api/admin";
import { Button, StatusBadge as UiStatusBadge, type StatusBadgeStatus } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { ChevronLeft, ChevronRight, MessageSquareWarning, AlertTriangle } from "lucide-react";
import { AdminQueryError } from "@/components/admin/admin-query-error";
import { CATEGORY_LABEL } from "./_lib/labels";

type StatusFilter = "all" | "new" | "in_review" | "resolved" | "dismissed";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "new", label: "Новые" },
  { id: "in_review", label: "На рассмотрении" },
  { id: "all", label: "Все" },
  { id: "resolved", label: "Решены" },
  { id: "dismissed", label: "Отклонены" },
];

const STATUS_MAP: Record<string, { tone: StatusBadgeStatus; label: string }> = {
  new:       { tone: "pending",  label: "Новая" },
  in_review: { tone: "pending",  label: "На рассмотрении" },
  resolved:  { tone: "accepted", label: "Решена" },
  dismissed: { tone: "rejected", label: "Отклонена" },
};

const PRIORITY_CFG: Record<string, string> = {
  P0: "bg-danger-600 text-white",
  P1: "bg-accent-500 text-white",
  P2: "bg-accent-400 text-accent-700",
  P3: "bg-ink-200 text-ink-600",
};

function StatusBadge({ status }: { status: string }) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const m = STATUS_MAP[status] ?? STATUS_MAP["new"]!;
  return <UiStatusBadge status={m.tone} label={m.label} />;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function AdminComplaintsPage() {
  const [status, setStatus] = useState<StatusFilter>("new");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  // Cursor stack — each "Вперёд" pushes the next cursor, "Назад" pops it.
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors[cursors.length - 1];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "complaints", status, category, priority, cursor],
    queryFn: () =>
      listAdminComplaints({
        status: status === "all" ? undefined : status,
        category: category || undefined,
        priority: priority || undefined,
        cursor,
        limit: 50,
      }),
    staleTime: 30_000,
  });

  const items: ComplaintItem[] = data?.data ?? [];
  const hasNext = !!data?.nextCursor;
  const hasPrev = cursors.length > 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-disp font-extrabold text-ink-900">Жалобы</h1>
        <p className="text-[13px] text-ink-500">Обращения пользователей</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setStatus(t.id); setCursors([]); }}
            className={cn(
              "rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors",
              status === t.id ? "bg-ink-900 text-white" : "bg-white text-ink-600 hover:bg-ink-100",
            )}
          >
            {t.label}
          </button>
        ))}
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setCursors([]); }}
          className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-bold text-ink-600"
        >
          <option value="">Все категории</option>
          <option value="safety">Безопасность</option>
          <option value="fraud">Мошенничество</option>
          <option value="rudeness">Грубость</option>
          <option value="no_show">Не приехал</option>
          <option value="other">Другое</option>
        </select>
        <select
          value={priority}
          onChange={(e) => { setPriority(e.target.value); setCursors([]); }}
          className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-bold text-ink-600"
        >
          <option value="">Любой приоритет</option>
          <option value="P0">P0 — критично</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : isError ? (
        <AdminQueryError error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center">
          <MessageSquareWarning className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <p className="font-bold text-ink-600">Нет жалоб в этой категории</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Link key={c.id} href={`/admin/complaints/${c.id}`}>
              <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-card transition-shadow hover:shadow-lift">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", PRIORITY_CFG[c.priority] ?? PRIORITY_CFG.P3)}>
                      {c.priority}
                    </span>
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-600">
                      {CATEGORY_LABEL[c.category] ?? c.category}
                    </span>
                    {c.slaBreach && (
                      <span className="flex items-center gap-1 rounded-full bg-danger-100 px-2 py-0.5 text-[10px] font-bold text-danger-700">
                        <AlertTriangle className="h-3 w-3" />
                        SLA
                      </span>
                    )}
                    <span className="text-[12px] text-ink-400">{fmt(c.createdAt)}</span>
                  </div>
                  <p className="truncate text-[13px] font-bold text-ink-900">
                    {c.reporterName}
                    {c.targetUserId && " → пользователь"}
                    {c.targetTripId && " → поездка"}
                  </p>
                  <p className="truncate text-[12px] text-ink-500">{c.description}</p>
                </div>
                <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                  <StatusBadge status={c.status} />
                  <ChevronRight className="h-4 w-4 text-ink-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {(hasPrev || hasNext) && (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" size="sm" type="button" disabled={!hasPrev} onClick={() => setCursors((p) => p.slice(0, -1))}>
            <ChevronLeft className="h-4 w-4" /> Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={!hasNext}
            onClick={() => {
              if (data?.nextCursor) setCursors((p) => [...p, data.nextCursor!]);
            }}
          >
            Вперёд <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
