"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { requestVerificationDocs } from "@/lib/api/admin";
import { Button } from "@/components/ui";
import { adminErrorMessage } from "@/components/admin/admin-query-error";

// Backend RequestDocsBody caps a request at 4 documents.
const MAX_DOCS = 4;

export const REQUESTABLE_DOCS = [
  // ids MUST match the backend PhotoCategory enum — the old "driver_license"
  // id silently produced requests the driver's re-upload screen ignored.
  { id: "license", label: "Права — лицевая сторона" },
  { id: "license_back", label: "Права — обратная сторона" },
  { id: "car_passport", label: "Техпаспорт — лицевая сторона" },
  { id: "car_passport_back", label: "Техпаспорт — обратная сторона" },
  { id: "car_photo", label: "Фото автомобиля" },
  { id: "selfie", label: "Селфи" },
];

interface Props {
  id: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestDocsModal({ id, open, onClose, onSuccess }: Props) {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () => requestVerificationDocs(id, selectedDocs, note || undefined),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const toggle = (docId: string) =>
    setSelectedDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((d) => d !== docId)
        : prev.length >= MAX_DOCS
          ? prev
          : [...prev, docId],
    );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-6">
        <h2 className="mb-4 text-[18px] font-disp font-extrabold text-ink-900">
          Запросить документы
        </h2>
        <div className="mb-4 space-y-2">
          {REQUESTABLE_DOCS.map((d) => (
            <label
              key={d.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-100 px-4 py-2.5 hover:bg-ink-50"
            >
              <input
                type="checkbox"
                checked={selectedDocs.includes(d.id)}
                onChange={() => toggle(d.id)}
                disabled={!selectedDocs.includes(d.id) && selectedDocs.length >= MAX_DOCS}
                className="h-4 w-4 rounded"
              />
              <span className="text-[13px] font-semibold text-ink-700">{d.label}</span>
            </label>
          ))}
        </div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-500">
          Примечание (необязательно)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Дополнительные инструкции…"
          className="w-full rounded-xl border border-ink-200 p-3 text-[13px] outline-none focus:border-ink-400"
        />
        <p className="mt-1 text-[12px] text-ink-400">Не больше {MAX_DOCS} документов за раз</p>
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
            variant="cta"
            size="lg"
            type="button"
            onClick={() => mutate()}
            disabled={selectedDocs.length === 0 || isPending}
            className="flex-1"
          >
            {isPending ? "Отправляем…" : "Запросить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
