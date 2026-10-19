"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Car as CarIcon, Plus, Trash2, Users } from "lucide-react";
import { listMyCars, addCar, deleteCar } from "@/lib/api/cars";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
// tReg kept out on purpose — this card speaks the cars.* namespace only.
import { toastError, toastSuccess } from "@/components/layout/quick-toast";
import { CarForm } from "@/components/features/cars/car-form";
import { VerificationCard } from "@/components/features/driver/verification-card";
import { Spinner } from "@/components/ui";
import { QueryError } from "@/components/ui/query-error";

// «Мои авто» — the user's garage (Phase 1: cars publish trips, verification is
// an optional badge that lives here too, not a gate anywhere).

const CARD = "rounded-3xl bg-white p-5 shadow-card dark:bg-ink-900";

export function CarsTab() {
  const t = useTranslations("cars");
  const fe = useFriendlyError();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const carsQuery = useQuery({ queryKey: ["cars", "my"], queryFn: listMyCars, staleTime: 30_000 });
  const { data: cars = [], isLoading } = carsQuery;

  const addMut = useMutation({
    mutationFn: addCar,
    onSuccess: () => {
      toastSuccess(t("added"));
      setAdding(false);
      void qc.invalidateQueries({ queryKey: ["cars", "my"] });
    },
    onError: (e) => toastError(fe(extractError(e))),
  });
  const delMut = useMutation({
    mutationFn: deleteCar,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cars", "my"] }),
    onError: (e) => toastError(fe(extractError(e))),
  });

  return (
    <div className="flex flex-col gap-3.5">
      {/* Garage */}
      <div className={CARD}>
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-[16px] font-900 text-ink-900 dark:text-white">
            <CarIcon className="h-4 w-4 text-brand-600" aria-hidden="true" />
            {t("my_title")}
          </p>
          {/* Add is capped at 3 cars — at the limit, show the count instead. */}
          {!adding && cars.length > 0 && cars.length < 3 && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-[14px] font-800 text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("add_title")}
            </button>
          )}
          {cars.length >= 3 && (
            <span className="text-[13px] font-800 text-ink-400">{cars.length}/3</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6"><Spinner size={22} /></div>
        ) : carsQuery.isError ? (
          <QueryError error={carsQuery.error} onRetry={() => void carsQuery.refetch()} />
        ) : (
          <div className="space-y-2">
            {cars.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl bg-ink-50 px-3.5 py-3 dark:bg-ink-800"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-xs dark:bg-ink-900 dark:text-brand-300">
                  <CarIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-800 text-ink-900 dark:text-white">
                    {c.make} {c.model}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[13px] font-600 text-ink-500 dark:text-ink-400">
                    <span className="uppercase tracking-wider">{c.plate}</span>
                    <span className="flex items-center gap-0.5">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {c.seatsCount}
                    </span>
                    {c.color && <span>{c.color}</span>}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={t("delete")}
                  title={t("delete")}
                  disabled={delMut.isPending}
                  onClick={() => {
                    // Confirm — a destructive soft-delete shouldn't fire on a mis-tap.
                    if (window.confirm(t("delete_confirm"))) delMut.mutate(c.id);
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}

            {(adding || cars.length === 0) && (
              <div className="pt-1">
                {cars.length === 0 && (
                  <p className="mb-2.5 text-[14px] font-600 text-ink-500 dark:text-ink-400">{t("empty")}</p>
                )}
                <CarForm
                  showYear
                  onSubmit={(i) => addMut.mutate(i)}
                  pending={addMut.isPending}
                  submitLabel={t("add_title")}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verification — an optional trust badge, not a gate (Phase 1) */}
      <div className={CARD}>
        <VerificationCard />
      </div>
    </div>
  );
}
