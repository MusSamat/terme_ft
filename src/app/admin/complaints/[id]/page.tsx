"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminComplaint, resolveComplaint, type ComplaintItem } from "@/lib/api/admin";
import { normalizeMediaUrl } from "@/lib/utils/media-url";
import { Button, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { AdminQueryError, toastAdminError } from "@/components/admin/admin-query-error";
import { toastSuccess } from "@/components/layout/quick-toast";
import { CATEGORY_LABEL } from "../_lib/labels";

const PRIORITY_CFG: Record<string, string> = {
  P0: "bg-danger-600 text-white",
  P1: "bg-accent-500 text-white",
  P2: "bg-accent-400 text-accent-700",
  P3: "bg-ink-200 text-ink-600",
};

function fmt(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: complaint, isLoading, error, refetch } = useQuery<ComplaintItem>({
    queryKey: ["admin", "complaint", id],
    queryFn: () => getAdminComplaint(id),
    staleTime: 30_000,
  });

  const [resolveStatus, setResolveStatus] = useState<"resolved" | "dismissed">("resolved");
  const [resolution, setResolution] = useState("");

  const resolveMut = useMutation({
    mutationFn: () => resolveComplaint(id, resolveStatus, resolution),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "complaints"] });
      void qc.invalidateQueries({ queryKey: ["admin", "complaint", id] });
      void qc.invalidateQueries({ queryKey: ["admin", "kpi"] });
      toastSuccess("Решение сохранено");
      router.push("/admin/complaints");
    },
    onError: toastAdminError,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="p-6">
        <AdminQueryError error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const isOpen = complaint.status === "new" || complaint.status === "in_review";

  return (
    <div className="p-6">
      <Button
        variant="textGhost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Button>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-disp font-extrabold text-ink-900">Жалоба</h1>
          <p className="text-[13px] text-ink-500">{fmt(complaint.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", PRIORITY_CFG[complaint.priority] ?? PRIORITY_CFG.P3)}>
            {complaint.priority}
          </span>
          <StatusBadge
            status={
              complaint.status === "new" ? "pending" :
              complaint.status === "in_review" ? "pending" :
              complaint.status === "resolved" ? "accepted" : "rejected"
            }
            label={
              complaint.status === "new" ? "Новая" :
              complaint.status === "in_review" ? "На рассмотрении" :
              complaint.status === "resolved" ? "Решена" : "Отклонена"
            }
          />
          {complaint.slaBreach && (
            <span className="flex items-center gap-1 rounded-full bg-danger-100 px-2.5 py-1 text-[11px] font-bold text-danger-700">
              <AlertTriangle className="h-3 w-3" />
              SLA нарушен
            </span>
          )}
        </div>
      </div>

      {/* Reporter & target */}
      <div className="mb-4 rounded-2xl bg-white p-5 shadow-card">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-400">Участники</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Подал жалобу</p>
            <Link href={`/admin/users/${complaint.reporterId}`} className="mt-1 block font-bold text-ink-900 hover:underline">
              {complaint.reporterName}
            </Link>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Объект жалобы</p>
            {complaint.targetUserId ? (
              <Link href={`/admin/users/${complaint.targetUserId}`} className="mt-1 block text-[13px] font-bold text-ink-900 hover:underline">
                Открыть профиль пользователя →
              </Link>
            ) : complaint.targetTripId ? (
              <Link href={`/admin/trips?focus=${complaint.targetTripId}`} className="mt-1 block text-[13px] font-bold text-ink-900 hover:underline">
                Открыть поездку →
              </Link>
            ) : (
              <p className="mt-1 text-[13px] text-ink-400">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4 rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-ink-100 px-3 py-1 text-[12px] font-bold text-ink-600">
            {CATEGORY_LABEL[complaint.category] ?? complaint.category}
          </span>
        </div>
        <p className="text-[14px] leading-relaxed text-ink-800">{complaint.description}</p>
        {complaint.attachments.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {complaint.attachments.map((url, i) => (
              <a key={i} href={normalizeMediaUrl(url) ?? url} target="_blank" rel="noopener noreferrer">
                <img src={normalizeMediaUrl(url) ?? url} alt="" className="h-20 w-full rounded-xl object-cover hover:opacity-90" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Resolution (already closed) */}
      {!isOpen && complaint.resolution && (
        <div className="mb-4 rounded-2xl bg-ink-50 p-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-ink-400">Решение</p>
          <p className="text-[13px] text-ink-700">{complaint.resolution}</p>
          {complaint.resolvedAt && (
            <p className="mt-1 text-[11px] text-ink-400">{fmt(complaint.resolvedAt)}</p>
          )}
        </div>
      )}

      {/* Resolve form */}
      {isOpen && (
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <p className="mb-3 text-[13px] font-bold text-ink-700">Принять решение</p>
          <div className="mb-4 flex gap-2">
            {(["resolved", "dismissed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setResolveStatus(s)}
                className={cn(
                  "rounded-xl px-5 py-2.5 text-[13px] font-bold transition-colors",
                  resolveStatus === s
                    ? s === "resolved" ? "bg-brand-600 text-white" : "bg-ink-700 text-white"
                    : "border border-ink-200 text-ink-600 hover:bg-ink-50",
                )}
              >
                {s === "resolved" ? "Принять жалобу" : "Отклонить жалобу"}
              </button>
            ))}
          </div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
            Описание решения *
          </label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={3}
            placeholder="Опишите принятое решение…"
            className="mb-4 w-full rounded-xl border border-ink-200 p-3 text-[13px] outline-none focus:border-ink-400"
          />
          <Button
            variant={resolveStatus === "resolved" ? "brand" : "invert"}
            size="lg"
            onClick={() => resolveMut.mutate()}
            disabled={resolution.trim().length < 3 || resolveMut.isPending}
          >
            {resolveMut.isPending ? "Сохраняем…" : "Сохранить решение"}
          </Button>
        </div>
      )}
    </div>
  );
}
