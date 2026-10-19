"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { rejectVerification } from "@/lib/api/admin";
import { Button } from "@/components/ui";
import { adminErrorMessage } from "@/components/admin/admin-query-error";

interface Props {
  id: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectModal({ id, open, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState("");

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () => rejectVerification(id, reason.trim()),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-6">
        <h2 className="mb-4 text-[18px] font-disp font-extrabold text-ink-900">
          Отклонить верификацию
        </h2>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
          Причина отказа *
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Документы нечёткие / данные не совпадают…"
          className="w-full rounded-xl border border-ink-200 p-3 text-[13px] outline-none focus:border-ink-400"
        />
        <p className="mt-1 text-[12px] text-ink-400">Водитель увидит причину. Минимум 3 символа.</p>
        {error && (
          <p className="mt-3 rounded-xl bg-danger-50 px-4 py-2 text-[12px] text-danger-700">{adminErrorMessage(error)}</p>
        )}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="lg"
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="flex-1"
          >
            Отмена
          </Button>
          <Button
            variant="danger"
            size="lg"
            type="button"
            onClick={() => mutate()}
            disabled={reason.trim().length < 3 || isPending}
            className="flex-1"
          >
            {isPending ? "Отклоняем…" : "Подтвердить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
