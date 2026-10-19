"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PassengerRequest } from "@/lib/api/passenger-requests";
import { respondToRequest, type RespondInput } from "@/lib/api/passenger-requests";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { toastSuccess } from "@/components/layout/quick-toast";
import { Button, Spinner } from "@/components/ui";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { DatePicker } from "@/components/ui/date-picker";
import { TimeSelect24 } from "@/components/ui/time-select-24";
import { useRouteNames } from "@/lib/hooks/use-route-names";

interface Props {
  request: PassengerRequest;
  onClose: () => void;
}

const FIELD_LABEL = "mb-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-500";

export function RespondModal({ request, onClose }: Props) {
  const rn = useRouteNames();
  const qc = useQueryClient();
  const t = useTranslations("requests");
  const tToasts = useTranslations("toasts");
  const fe = useFriendlyError();
  const [price, setPrice] = useState("");
  // Calendar day in Kyrgyzstan (UTC+6), not the UTC date of the instant.
  const kgDay = new Date(new Date(request.departureDate).getTime() + 6 * 3_600_000).toISOString().slice(0, 10);
  const [date, setDate] = useState(kgDay);
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const iso = new Date(`${date}T${time}:00+06:00`).toISOString();
      const input: RespondInput = {
        price: Number(price),
        departureTime: iso,
        ...(message.trim() ? { message: message.trim() } : {}),
      };
      return respondToRequest(request.id, input);
    },
    onSuccess: () => {
      toastSuccess(tToasts("offer_sent"));
      void qc.invalidateQueries({ queryKey: ["request-responses", request.id] });
      void qc.invalidateQueries({ queryKey: ["passenger-requests"] });
      void qc.invalidateQueries({ queryKey: ["passenger-request", request.id] });
      onClose();
    },
    onError: (e) => setError(fe(extractError(e))),
  });

  // Backend RespondBody: price int 50..10000, departureTime required.
  const priceNum = Number(price);
  const priceValid = Boolean(price) && Number.isFinite(priceNum) && Number.isInteger(priceNum) && priceNum >= 50 && priceNum <= 10_000;
  const priceError = price && !priceValid ? t("price_range") : null;
  const canSubmit = priceValid && Boolean(date) && Boolean(time);

  // Radix Modal owns focus-trap / Escape / scroll-lock / aria; closing via
  // onOpenChange covers overlay-click, the ✕ button and the Esc key uniformly.
  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent className="max-w-[480px] p-0">
        <div className="p-5">
          <ModalHeader>
            <ModalTitle className="text-[17px] font-extrabold">{t("respond_title")}</ModalTitle>
            <ModalDescription className="text-[13px] text-ink-500">
              {rn(request).from} → {rn(request).to}
            </ModalDescription>
          </ModalHeader>

          <div className="flex flex-col gap-4">
            <div>
              <p className={FIELD_LABEL}>{t("price_label")}</p>
              <input
                type="text"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("price_placeholder")}
                className="h-12 w-full rounded-2xl border-2 border-ink-200 bg-ink-50 px-4 text-[17px] font-bold text-ink-900 outline-none focus:border-brand-400 focus:bg-white dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              />
              {priceError && (
                <p className="mt-1.5 text-[13px] font-700 text-danger-600 dark:text-danger-400">{priceError}</p>
              )}
            </div>

            {/* Date + time — stacked on mobile (each full-width, so the date
                isn't truncated and the time selects don't overflow), side by
                side from sm up where there's room. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[5fr_7fr]">
              <div className="min-w-0">
                <p className={FIELD_LABEL}>{t("date_label")}</p>
                <DatePicker
                  min={kgDay}
                  value={date}
                  onChange={setDate}
                  triggerClassName="h-12 w-full rounded-2xl border-2 border-ink-200 bg-ink-50 px-3 text-[15px] dark:bg-ink-800 dark:border-ink-700"
                />
              </div>
              <div className="min-w-0">
                <p className={FIELD_LABEL}>{t("time_label")}</p>
                <TimeSelect24 value={time} onChange={setTime} ariaLabel={t("time_label")} />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-400">
                {t("message_label")}
              </p>
              <textarea
                rows={2}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("message_placeholder")}
                className="w-full resize-none rounded-2xl border-2 border-ink-200 bg-ink-50 px-4 py-3 text-[14px] text-ink-900 outline-none focus:border-brand-400 focus:bg-white placeholder:text-ink-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-danger-50 px-4 py-3 text-[15px] font-semibold text-danger-700 dark:bg-danger-500/10 dark:text-danger-300">
                {error}
              </div>
            )}

            <Button
              type="button"
              variant="cta"
              size="lg"
              className="w-full"
              disabled={!canSubmit || isPending}
              onClick={() => {
                setError(null);
                mutate();
              }}
            >
              {isPending ? (
                <Spinner size={18} />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" aria-hidden />
                  {t("submit_response")}
                </>
              )}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
