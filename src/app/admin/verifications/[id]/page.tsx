"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getVerification,
  approveVerification,
  type VerificationDetail,
} from "@/lib/api/admin";
import { Button, StatusBadge, type StatusBadgeStatus } from "@/components/ui";
import { ArrowLeft, CheckCircle2, XCircle, FileQuestion } from "lucide-react";
import { PhotoCard } from "./_components/photo-card";
import { normalizeMediaUrl } from "@/lib/utils/media-url";

// Storage URLs come with the backend's BASE_URL (localhost in dev) — rewrite
// to the API origin the admin actually uses (tunnel), like the avatar path.
const norm = (u: string): string => normalizeMediaUrl(u) ?? u;
import { RejectModal } from "./_components/reject-modal";
import { RequestDocsModal, REQUESTABLE_DOCS } from "./_components/request-docs-modal";
import { AdminQueryError, toastAdminError } from "@/components/admin/admin-query-error";
import { toastSuccess } from "@/components/layout/quick-toast";

function fmt(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  pending: "На проверке",
  verified: "Одобрен",
  rejected: "Отклонён",
  docs_requested: "Нужны документы",
};

const STATUS_TONE: Record<string, StatusBadgeStatus> = {
  pending: "pending",
  verified: "active",
  rejected: "rejected",
  docs_requested: "accepted",
};

export default function VerificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: item, isLoading, error, refetch } = useQuery<VerificationDetail>({
    queryKey: ["admin", "verification", id],
    queryFn: () => getVerification(id),
    staleTime: 30_000,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "verifications"] });
    void qc.invalidateQueries({ queryKey: ["admin", "verification", id] });
    void qc.invalidateQueries({ queryKey: ["admin", "kpi"] });
  };

  const approveMut = useMutation({
    mutationFn: () => approveVerification(id),
    onSuccess: () => { invalidate(); toastSuccess("Водитель одобрен"); router.push("/admin/verifications"); },
    onError: toastAdminError,
  });

  const [rejectOpen, setRejectOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  // Fast review — keyboard shortcuts: A approve · R reject · D request docs.
  // Suppressed while a photo lightbox or a modal is open (they have their own keys).
  useEffect(() => {
    const canAct = item?.verificationStatus === "pending" || item?.verificationStatus === "docs_requested";
    const onKey = (e: KeyboardEvent) => {
      if (!canAct || rejectOpen || docsOpen) return;
      // Ctrl/Cmd+A (select all) etc. must never approve a driver.
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      if (k === "a") { e.preventDefault(); if (!approveMut.isPending) approveMut.mutate(); }
      else if (k === "r") { e.preventDefault(); setRejectOpen(true); }
      else if (k === "d") { e.preventDefault(); setDocsOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item?.verificationStatus, rejectOpen, docsOpen, approveMut]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6">
        <AdminQueryError error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const isPending =
    item.verificationStatus === "pending" || item.verificationStatus === "docs_requested";

  return (
    <div className="p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-[13px] font-bold text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-disp font-extrabold text-ink-900">
            Верификация: {item.user.name}
          </h1>
          <p className="text-[13px] text-ink-500">Подано {fmt(item.submittedAt)}</p>
        </div>
        <StatusBadge
          status={STATUS_TONE[item.verificationStatus] ?? "pending"}
          label={STATUS_LABEL[item.verificationStatus] ?? item.verificationStatus}
        />
      </div>

      {/* Driver info */}
      <div className="mb-4 rounded-2xl bg-white p-5 shadow-card">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-400">
          Водитель
        </p>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-200 text-[20px] font-bold text-ink-600">
            {item.user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[16px] font-extrabold text-ink-900">{item.user.name}</p>
            <p className="text-[13px] text-ink-500">{item.user.phone}</p>
          </div>
        </div>
        {item.rejectionReason && (
          <div className="mt-3 rounded-xl bg-ink-50 px-4 py-3 text-[13px] text-ink-700">
            <span className="font-bold text-ink-500">Заметка: </span>
            {item.rejectionReason}
          </div>
        )}
        {item.requestedDocs.length > 0 && (
          <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3">
            <p className="text-[12px] font-bold text-sky-700">Запрошены документы:</p>
            <p className="text-[12px] text-sky-700">
              {item.requestedDocs.map((d) => REQUESTABLE_DOCS.find((r) => r.id === d)?.label ?? d).join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* Car info */}
      <div className="mb-4 rounded-2xl bg-white p-5 shadow-card">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-400">
          Автомобиль
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Марка", value: item.car.make },
            { label: "Модель", value: item.car.model },
            { label: "Год", value: item.car.year },
            { label: "Цвет", value: item.car.color },
            { label: "Номер", value: item.car.plate },
            { label: "Мест", value: item.car.seats },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">
                {label}
              </p>
              <p className="text-[14px] font-bold text-ink-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div className="mb-4 rounded-2xl bg-white p-5 shadow-card">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-400">
          Документы и фото
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <PhotoCard label="Права — лицевая" src={norm(item.photos.license)} />
          {item.photos.licenseBack && (
            <PhotoCard label="Права — обратная" src={norm(item.photos.licenseBack)} />
          )}
          <PhotoCard label="Техпаспорт — лицевая" src={norm(item.photos.carPassport)} />
          {item.photos.carPassportBack && (
            <PhotoCard label="Техпаспорт — обратная" src={norm(item.photos.carPassportBack)} />
          )}
          <PhotoCard label="Фото авто (спереди)" src={norm(item.photos.carPhoto)} />
          <PhotoCard label="Сэлфи" src={norm(item.photos.selfie)} />
        </div>
      </div>

      {/* Actions — sticky bar, always in reach while scrolling the photos */}
      {isPending && (
        <div className="sticky bottom-0 z-10 -mx-6 border-t border-ink-200 bg-white/95 px-6 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="brand" size="lg" type="button" onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
              <CheckCircle2 className="h-5 w-5" />
              {approveMut.isPending ? "Одобряем…" : "Одобрить"}
            </Button>
            <Button variant="cta" size="lg" type="button" onClick={() => setDocsOpen(true)}>
              <FileQuestion className="h-5 w-5" />
              Запросить документы
            </Button>
            <Button variant="danger" size="lg" type="button" onClick={() => setRejectOpen(true)}>
              <XCircle className="h-5 w-5" />
              Отклонить
            </Button>
            <span className="ml-auto hidden text-[12px] font-semibold text-ink-400 sm:block">
              <kbd className="rounded bg-ink-100 px-1.5 py-0.5 font-mono">A</kbd> одобрить ·{" "}
              <kbd className="rounded bg-ink-100 px-1.5 py-0.5 font-mono">R</kbd> отклонить ·{" "}
              <kbd className="rounded bg-ink-100 px-1.5 py-0.5 font-mono">D</kbd> документы
            </span>
          </div>
        </div>
      )}

      <RejectModal
        id={id}
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onSuccess={() => { invalidate(); toastSuccess("Верификация отклонена"); router.push("/admin/verifications"); }}
      />

      <RequestDocsModal
        id={id}
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        onSuccess={() => { invalidate(); toastSuccess("Документы запрошены"); router.push("/admin/verifications"); }}
      />
    </div>
  );
}
