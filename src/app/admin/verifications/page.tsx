"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listVerifications, type VerificationQueueItem } from "@/lib/api/admin";
import { cn } from "@/lib/utils/cn";
import { Button, StatusBadge as UiStatusBadge, type StatusBadgeStatus } from "@/components/ui";
import { ChevronRight, ChevronLeft, Clock, AlertTriangle } from "lucide-react";
import { AdminQueryError } from "@/components/admin/admin-query-error";

type StatusFilter = "all" | "pending" | "verified" | "rejected" | "docs_requested";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "pending", label: "На проверке" },
  { id: "docs_requested", label: "Нужны документы" },
  { id: "all", label: "Все" },
  { id: "verified", label: "Одобрены" },
  { id: "rejected", label: "Отклонены" },
];

const STATUS_CFG: Record<string, { label: string; tone: StatusBadgeStatus }> = {
  pending: { label: "На проверке", tone: "pending" },
  verified: { label: "Одобрен", tone: "active" },
  rejected: { label: "Отклонён", tone: "rejected" },
  docs_requested: { label: "Нужны доки", tone: "accepted" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, tone: "completed" as StatusBadgeStatus };
  return <UiStatusBadge status={cfg.tone} label={cfg.label} />;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminVerificationsPage() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  // Cursor stack — each "Вперёд" pushes the next cursor, "Назад" pops it.
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors[cursors.length - 1];

  const selectStatus = (next: StatusFilter) => {
    setStatus(next);
    setCursors([]); // reset pagination when the filter changes
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "verifications", status, cursor],
    queryFn: () =>
      listVerifications({ status: status === "all" ? undefined : status, cursor, limit: 20 }),
    staleTime: 30_000,
  });

  const items: VerificationQueueItem[] = data?.data ?? [];
  const hasNext = !!data?.nextCursor;
  const hasPrev = cursors.length > 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-disp font-extrabold text-ink-900">Верификации водителей</h1>
        <p className="text-[13px] text-ink-500">Очередь заявок на верификацию</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectStatus(t.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors",
              status === t.id
                ? "bg-ink-900 text-white"
                : "bg-white text-ink-600 hover:bg-ink-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : isError ? (
        <AdminQueryError error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center">
          <Clock className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <p className="font-bold text-ink-600">Нет заявок в этой категории</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link key={item.id} href={`/admin/verifications/${item.id}`}>
              <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-card transition-shadow hover:shadow-lift">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-200 text-[14px] font-bold text-ink-600">
                    {item.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-ink-900">{item.userName}</p>
                      {item.slaBreach && (
                        <span className="flex items-center gap-1 rounded-full bg-danger-100 px-2 py-0.5 text-[10px] font-bold text-danger-700">
                          <AlertTriangle className="h-3 w-3" />
                          SLA
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-ink-500">
                      {item.userPhone} · {item.carMake} {item.carModel} · {item.carPlate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden text-right sm:block">
                    <p className="text-[12px] text-ink-500">Подано {fmt(item.submittedAt)}</p>
                  </div>
                  <StatusBadge status={item.verificationStatus} />
                  <ChevronRight className="h-4 w-4 text-ink-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {(hasPrev || hasNext) && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={!hasPrev}
            onClick={() => setCursors((p) => p.slice(0, -1))}
          >
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
