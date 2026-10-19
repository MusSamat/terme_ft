"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { AdminTripItem } from "@/lib/api/admin";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const CANCEL_REASONS = [
  "Нарушение правил платформы",
  "Фиктивная поездка",
  "Жалоба пассажиров",
  "Технический сбой",
  "Другое",
];

interface ForceCancelModalProps {
  cancelTarget: AdminTripItem;
  cancelReason: string;
  customReason: string;
  isPending: boolean;
  errorMessage: string | null;
  onReasonChange: (reason: string) => void;
  onCustomReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ForceCancelModal({
  cancelTarget,
  cancelReason,
  customReason,
  isPending,
  errorMessage,
  onReasonChange,
  onCustomReasonChange,
  onClose,
  onConfirm,
}: ForceCancelModalProps) {
  const effectiveReason = cancelReason === "Другое" ? customReason : cancelReason;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-disp font-extrabold text-ink-900">Отменить поездку</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-ink-100"
          >
            <X className="h-5 w-5 text-ink-400" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl bg-accent-50 p-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-accent-600" />
          <div>
            <p className="text-[13px] font-bold text-accent-700">
              {cancelTarget.originCity} → {cancelTarget.destinationCity}
            </p>
            <p className="text-[12px] text-accent-700">{fmtDate(cancelTarget.departureAt)}</p>
          </div>
        </div>

        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-500">
          Причина отмены *
        </p>
        <div className="mb-3 space-y-1.5">
          {CANCEL_REASONS.map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-100 px-4 py-2.5 hover:bg-ink-50"
            >
              <input
                type="radio"
                name="cancel_reason"
                value={r}
                checked={cancelReason === r}
                onChange={() => onReasonChange(r)}
                className="h-4 w-4"
              />
              <span className="text-[13px] font-semibold text-ink-700">{r}</span>
            </label>
          ))}
        </div>
        {cancelReason === "Другое" && (
          <textarea
            value={customReason}
            onChange={(e) => onCustomReasonChange(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Укажите причину (минимум 3 символа)…"
            className="mb-3 w-full rounded-xl border border-ink-200 p-3 text-[13px] outline-none focus:border-ink-400"
          />
        )}
        {errorMessage && (
          <p className="mb-3 rounded-xl bg-danger-50 px-4 py-2 text-[12px] text-danger-700">
            {errorMessage}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={onClose}
            className="flex-1"
          >
            Отмена
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={onConfirm}
            disabled={effectiveReason.trim().length < 3 || isPending}
            className="flex-1"
          >
            {isPending ? "Отменяем…" : "Подтвердить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
