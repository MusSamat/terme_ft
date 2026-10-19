"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminForceCancel,
  getAdminTrip,
  listAdminTrips,
  type AdminTripItem,
} from "@/lib/api/admin";
import { Button, StatusBadge, type StatusBadgeStatus } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { Car, ChevronLeft, ChevronRight } from "lucide-react";
import { TripDetailPanel } from "./_components/trip-detail-panel";
import { ForceCancelModal } from "./_components/force-cancel-modal";
import { TripSearchBar } from "./_components/trip-search-bar";
import { AdminQueryError, adminErrorMessage } from "@/components/admin/admin-query-error";
import { toastSuccess } from "@/components/layout/quick-toast";

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

type StatusTab = "active" | "completed" | "cancelled" | "all";

const STATUS_BADGE: Record<string, { tone: StatusBadgeStatus; label: string }> = {
  active:    { tone: "active",    label: "Активна" },
  completed: { tone: "completed", label: "Завершена" },
  cancelled: { tone: "rejected",  label: "Отменена" },
};

const LIMIT = 20;

export default function AdminTripsPage() {
  const qc = useQueryClient();

  const [status, setStatus] = useState<StatusTab>("active");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors[cursors.length - 1];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Deep-link: /admin/trips?focus=<id> opens that trip's detail panel directly
  // (the panel fetches by id, so it works even if the trip isn't on this page).
  const searchParams = useSearchParams();
  useEffect(() => {
    const f = searchParams.get("focus");
    if (f) setSelectedId(f);
  }, [searchParams]);
  const [cancelTarget, setCancelTarget] = useState<AdminTripItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const tripsQuery = useQuery({
    queryKey: ["admin", "trips", status, fromFilter, toFilter, cursor],
    queryFn: () =>
      listAdminTrips({
        status: status === "all" ? undefined : status,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        cursor,
        limit: LIMIT,
      }),
    staleTime: 30_000,
  });

  const detailQuery = useQuery({
    queryKey: ["admin", "trip", selectedId],
    queryFn: () => getAdminTrip(selectedId!),
    enabled: !!selectedId,
    staleTime: 30_000,
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminForceCancel(id, reason),
    onSuccess: () => {
      setCancelTarget(null);
      setCancelReason("");
      setCustomReason("");
      void qc.invalidateQueries({ queryKey: ["admin", "trips"] });
      void qc.invalidateQueries({ queryKey: ["admin", "trip"] });
      void qc.invalidateQueries({ queryKey: ["admin", "user"] });
      void qc.invalidateQueries({ queryKey: ["admin", "kpi"] });
      toastSuccess("Поездка отменена, пассажиры уведомлены");
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setCursors([]);
    setFromFilter(fromInput);
    setToFilter(toInput);
  }

  function changeStatus(s: StatusTab) {
    setStatus(s);
    setCursors([]);
  }

  function openCancelModal(t: AdminTripItem) {
    setCancelTarget(t);
    setCancelReason("");
    setCustomReason("");
  }

  const trips = tripsQuery.data?.data ?? [];
  const hasNext = !!tripsQuery.data?.nextCursor;
  const hasPrev = cursors.length > 0;
  const effectiveReason = cancelReason === "Другое" ? customReason : cancelReason;
  const detail = detailQuery.data;

  return (
    <div className="flex h-full">
      <div className={cn("flex flex-col overflow-hidden", selectedId ? "flex-1" : "flex-1")}>
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-5">
            <h1 className="text-[24px] font-disp font-extrabold text-ink-900">Поездки</h1>
            <p className="text-[13px] text-ink-500">
              Просмотр всех поездок, принудительная отмена
            </p>
          </div>

          <TripSearchBar
            status={status}
            fromInput={fromInput}
            toInput={toInput}
            fromFilter={fromFilter}
            toFilter={toFilter}
            onStatusChange={changeStatus}
            onFromInput={setFromInput}
            onToInput={setToInput}
            onSearch={handleSearch}
            onReset={() => {
              setFromInput(""); setToInput("");
              setFromFilter(""); setToFilter("");
              setCursors([]);
            }}
          />

          {tripsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : tripsQuery.isError ? (
            <AdminQueryError error={tripsQuery.error} onRetry={() => void tripsQuery.refetch()} />
          ) : trips.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center">
              <Car className="mx-auto mb-3 h-10 w-10 text-ink-300" />
              <p className="font-bold text-ink-500">Поездки не найдены</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-2xl bg-white p-4 shadow-card transition-shadow hover:shadow-lift",
                    selectedId === t.id && "ring-2 ring-ink-900",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink-900 truncate">
                      {t.originCity} → {t.destinationCity}
                    </p>
                    <p className="text-[12px] text-ink-500">
                      {fmtDateShort(t.departureAt)}
                      {" · "}
                      <span className="text-ink-700 font-semibold">{t.driver.name}</span>
                      {" · "}
                      {t.seatsAvailable}/{t.seatsTotal} мест
                      {" · "}
                      {t.pricePerSeat} сом
                      {t.bookingsCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-accent-100 px-1.5 py-0.5 text-[10px] font-bold text-accent-700">
                          {t.bookingsCount} брон.
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                    <StatusBadge
                      status={STATUS_BADGE[t.status]?.tone ?? t.status}
                      label={STATUS_BADGE[t.status]?.label}
                    />
                    {t.status === "active" && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCancelModal(t);
                        }}
                      >
                        Отменить
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(hasPrev || hasNext) && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                disabled={!hasPrev}
                onClick={() => setCursors((p) => p.slice(0, -1))}
              >
                <ChevronLeft className="h-4 w-4" /> Назад
              </Button>
              <Button
                variant="outline"
                disabled={!hasNext}
                onClick={() => {
                  if (tripsQuery.data?.nextCursor)
                    setCursors((p) => [...p, tripsQuery.data.nextCursor!]);
                }}
              >
                Вперёд <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {selectedId && (
        detail ? (
          <TripDetailPanel
            detail={detail}
            isLoading={detailQuery.isLoading}
            onClose={() => setSelectedId(null)}
            onForceCancel={openCancelModal}
          />
        ) : detailQuery.isLoading ? (
          <div className="w-[440px] flex-shrink-0 border-l border-ink-200 bg-white flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink-200 border-t-ink-700" />
          </div>
        ) : (
          <div className="w-[440px] flex-shrink-0 border-l border-ink-200 bg-white p-6 text-center text-ink-500">
            Не удалось загрузить
          </div>
        )
      )}

      {cancelTarget && (
        <ForceCancelModal
          cancelTarget={cancelTarget}
          cancelReason={cancelReason}
          customReason={customReason}
          isPending={cancelMut.isPending}
          errorMessage={cancelMut.error ? adminErrorMessage(cancelMut.error) : null}
          onReasonChange={setCancelReason}
          onCustomReasonChange={setCustomReason}
          onClose={() => { cancelMut.reset(); setCancelTarget(null); }}
          onConfirm={() => cancelMut.mutate({ id: cancelTarget.id, reason: effectiveReason.trim() })}
        />
      )}
    </div>
  );
}
