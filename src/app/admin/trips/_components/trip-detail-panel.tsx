"use client";

import Link from "next/link";
import { AlertTriangle, Phone, ShieldCheck, User, X } from "lucide-react";
import { Button, StatusBadge, type StatusBadgeStatus } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { AdminTripDetail, AdminTripItem } from "@/lib/api/admin";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const BOOKING_STATUS: Record<string, { tone: StatusBadgeStatus; label: string }> = {
  pending:                { tone: "pending",   label: "В ожидании" },
  accepted:               { tone: "accepted",  label: "Принято" },
  rejected:               { tone: "rejected",  label: "Отклонено" },
  completed:              { tone: "completed", label: "Завершено" },
  cancelled_by_passenger: { tone: "completed", label: "Отменено пассажиром" },
  cancelled_by_driver:    { tone: "completed", label: "Отменено водителем" },
  cancelled_late:         { tone: "pending",   label: "Поздняя отмена" },
  no_show:                { tone: "rejected",  label: "Неявка" },
  expired:                { tone: "completed", label: "Истекло" },
};

const VERIF_STATUS: Record<string, { label: string; cls: string }> = {
  verified:   { label: "Верифицирован",  cls: "bg-brand-50 text-brand-700" },
  pending:    { label: "На проверке",    cls: "bg-accent-50 text-accent-700" },
  rejected:   { label: "Отклонён",       cls: "bg-danger-50 text-danger-700" },
  suspended:  { label: "Приостановлен",  cls: "bg-accent-50 text-accent-700" },
  blocked:    { label: "Заблокирован",   cls: "bg-danger-50 text-danger-700" },
};

function verifStatus(s: string) {
  return VERIF_STATUS[s] ?? VERIF_STATUS.pending!;
}

const TRIP_STATUS_LABEL: Record<string, string> = {
  active: "Активна",
  completed: "Завершена",
  cancelled: "Отменена",
};

interface TripDetailPanelProps {
  detail: AdminTripDetail;
  isLoading: boolean;
  onClose: () => void;
  onForceCancel: (trip: AdminTripItem) => void;
}

export function TripDetailPanel({ detail, isLoading, onClose, onForceCancel }: TripDetailPanelProps) {
  return (
    <div className="w-[440px] flex-shrink-0 border-l border-ink-200 bg-white overflow-auto">
      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink-200 border-t-ink-700" />
        </div>
      ) : (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-[18px] font-extrabold text-ink-900">
                {detail.originCity} → {detail.destinationCity}
              </p>
              <p className="text-[12px] text-ink-500">{fmtDate(detail.departureAt)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 hover:bg-ink-100"
            >
              <X className="h-5 w-5 text-ink-400" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { label: "Статус", value: TRIP_STATUS_LABEL[detail.status] ?? detail.status },
              { label: "Цена", value: `${detail.pricePerSeat} сом` },
              { label: "Места", value: `${detail.seatsAvailable}/${detail.seatsTotal}` },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-ink-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">{f.label}</p>
                <p className="mt-0.5 text-[14px] font-bold text-ink-800">{f.value}</p>
              </div>
            ))}
          </div>

          {detail.cancelledReason && (
            <div className="mb-4 flex gap-2 rounded-xl bg-danger-50 p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-danger-500 mt-0.5" />
              <p className="text-[12px] text-danger-700">{detail.cancelledReason}</p>
            </div>
          )}

          {detail.originAddress && (
            <p className="mb-4 text-[12px] text-ink-500">
              <span className="font-semibold text-ink-700">Адрес: </span>
              {detail.originAddress}
            </p>
          )}

          <div className="mb-4 rounded-2xl bg-ink-50 p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-400">
              Водитель
            </p>
            <div className="flex items-center justify-between">
              <Link
                href={`/admin/users/${detail.driver.id}`}
                className="flex items-center gap-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-200">
                  <User className="h-4 w-4 text-ink-500" />
                </div>
                <span className="text-[13px] font-bold text-ink-900">{detail.driver.name}</span>
              </Link>
              {detail.driver.phone && (
                <a
                  href={`tel:${detail.driver.phone}`}
                  className="flex items-center gap-1.5 text-[12px] text-brand-700 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {detail.driver.phone}
                </a>
              )}
            </div>
            {detail.driverProfile && (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-bold",
                    verifStatus(detail.driverProfile.verificationStatus).cls,
                  )}
                >
                  <ShieldCheck className="mr-1 inline h-3 w-3" />
                  {verifStatus(detail.driverProfile.verificationStatus).label}
                </span>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 font-semibold text-ink-600">
                  {detail.driverProfile.carPlate}
                </span>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 font-semibold text-ink-600">
                  {detail.driverProfile.carMake} {detail.driverProfile.carModel}{" "}
                  {detail.driverProfile.carYear}
                </span>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 font-semibold text-ink-600">
                  {detail.driverProfile.carColor}
                </span>
              </div>
            )}
          </div>

          {detail.status === "active" && (
            <Button
              variant="danger"
              onClick={() => onForceCancel(detail)}
              className="mb-4 w-full"
            >
              Принудительно отменить поездку
            </Button>
          )}

          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Бронирования ({detail.bookings.length})
          </p>
          {detail.bookings.length === 0 ? (
            <p className="text-[13px] text-ink-400">Нет бронирований</p>
          ) : (
            <div className="space-y-2">
              {detail.bookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-ink-100 p-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/admin/users/${b.passengerId}`}
                      className="text-[13px] font-bold text-ink-900 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {b.passengerName}
                    </Link>
                    <StatusBadge
                      status={BOOKING_STATUS[b.status]?.tone ?? b.status}
                      label={BOOKING_STATUS[b.status]?.label}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-ink-500">
                    {b.passengerPhone && (
                      <a href={`tel:${b.passengerPhone}`} className="flex items-center gap-1 text-brand-700 hover:underline">
                        <Phone className="h-3 w-3" />{b.passengerPhone}
                      </a>
                    )}
                    <span>{b.seatsCount} {b.seatsCount === 1 ? "место" : "места"}</span>
                    <span>{fmtDateShort(b.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
