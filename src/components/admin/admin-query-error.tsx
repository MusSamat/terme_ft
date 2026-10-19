"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import { extractError } from "@/lib/api/client";
import { toastError } from "@/components/layout/quick-toast";
import { Button } from "@/components/ui";

// Admin UI is RU-only (no next-intl), so backend errors are mapped here.
export function adminErrorMessage(e: unknown): string {
  const err = extractError(e);
  if (err.code === "FORBIDDEN") return "Недостаточно прав — действие доступно только суперадмину";
  if (err.code === "NOT_FOUND") return "Запись не найдена";
  if (err.code === "VALIDATION_ERROR") return "Проверьте введённые данные";
  if (err.code === "INTERNAL_ERROR") return "Что-то пошло не так. Попробуйте снова.";
  return err.message;
}

export const toastAdminError = (e: unknown): void => toastError(adminErrorMessage(e));

/** Inline block for a failed admin query — distinct from the empty state. */
export function AdminQueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl bg-white p-10 text-center shadow-card">
      <ServerCrash className="h-10 w-10 text-danger-500" aria-hidden="true" />
      <p className="max-w-[420px] font-bold text-ink-600">{adminErrorMessage(error)}</p>
      {extractError(error).code !== "FORBIDDEN" && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Повторить
        </Button>
      )}
    </div>
  );
}
