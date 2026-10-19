"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminUser, blockUser, unblockUser,
  getAdminTrip, getAdminRequest, adminForceCancel, adminForceCancelRequest,
} from "@/lib/api/admin";
import { TripDetailPanel } from "@/app/admin/trips/_components/trip-detail-panel";
import { Button, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft, Star, ShieldOff, ShieldCheck, Phone, Car, Calendar, X,
} from "lucide-react";
import { normalizeMediaUrl } from "@/lib/utils/media-url";
import { AdminQueryError, toastAdminError } from "@/components/admin/admin-query-error";
import { toastSuccess } from "@/components/layout/quick-toast";

function fmt(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function statusTone(status: string): string {
  if (["active", "open", "verified", "accepted"].includes(status)) return "bg-brand-100 text-brand-700";
  if (["cancelled", "rejected", "expired"].includes(status)) return "bg-danger-100 text-danger-700";
  return "bg-ink-100 text-ink-500";
}

const BLOCK_REASONS = [
  "Нарушение правил платформы",
  "Мошенничество",
  "Агрессивное поведение",
  "Фальшивые документы",
  "Другое",
];

const CANCEL_REASONS = [
  "Нарушение правил платформы",
  "Мошенничество",
  "Некорректный маршрут",
  "Спам / дубликат",
  "Другое",
];

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => getAdminUser(id),
    staleTime: 30_000,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "user", id] });
    void qc.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const blockMut = useMutation({
    mutationFn: () => blockUser(id, (blockReason === "Другое" ? customReason : blockReason).trim()),
    onSuccess: () => { invalidate(); setBlockOpen(false); toastSuccess("Пользователь заблокирован"); },
    onError: toastAdminError,
  });

  const unblockMut = useMutation({
    mutationFn: () => unblockUser(id),
    onSuccess: () => { invalidate(); toastSuccess("Блокировка снята"); },
    onError: toastAdminError,
  });

  // In-page viewers: open a trip/request detail in a modal (no navigation).
  const [viewTrip, setViewTrip] = useState<string | null>(null);
  const [viewRequest, setViewRequest] = useState<string | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ kind: "trip" | "request"; id: string; title: string } | null>(null);
  const [cxReason, setCxReason] = useState("");
  const [cxCustom, setCxCustom] = useState("");
  const cxEffective = cxReason === "Другое" ? cxCustom.trim() : cxReason;

  const tripQuery = useQuery({ queryKey: ["admin", "trip", viewTrip], queryFn: () => getAdminTrip(viewTrip!), enabled: !!viewTrip, staleTime: 30_000 });
  const reqQuery = useQuery({ queryKey: ["admin", "request", viewRequest], queryFn: () => getAdminRequest(viewRequest!), enabled: !!viewRequest, staleTime: 30_000 });

  const cancelMut = useMutation({
    mutationFn: ({ kind, id: tid, reason }: { kind: "trip" | "request"; id: string; reason: string }) =>
      kind === "trip" ? adminForceCancel(tid, reason) : adminForceCancelRequest(tid, reason),
    onSuccess: () => {
      setCancelTarget(null); setCxReason(""); setCxCustom("");
      invalidate();
      void qc.invalidateQueries({ queryKey: ["admin", "trip"] });
      void qc.invalidateQueries({ queryKey: ["admin", "trips"] });
      void qc.invalidateQueries({ queryKey: ["admin", "request"] });
      void qc.invalidateQueries({ queryKey: ["admin", "requests"] });
      void qc.invalidateQueries({ queryKey: ["admin", "kpi"] });
      toastSuccess("Отменено, пользователь уведомлён");
    },
    onError: toastAdminError,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <AdminQueryError error={error} onRetry={() => void refetch()} />
      </div>
    );
  }
  const avatarSrc = user.avatarUrl ? (normalizeMediaUrl(user.avatarUrl) ?? user.avatarUrl) : null;

  const effectiveReason = blockReason === "Другое" ? customReason : blockReason;

  return (
    <div className="p-6">
      <Button
        type="button"
        variant="textGhost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Button>

      {/* Profile card */}
      <div className="mb-4 rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {avatarSrc ? (
              <button type="button" onClick={() => setAvatarOpen(true)} className="rounded-full ring-offset-2 transition hover:ring-2 hover:ring-ink-300" aria-label="Открыть фото крупнее">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarSrc} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
              </button>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-200 text-[22px] font-bold text-ink-600">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[20px] font-extrabold text-ink-900">{user.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {user.roles.map((r) => (
                  <span key={r} className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold",
                    r === "driver" ? "bg-sky-100 text-sky-700" : "bg-brand-100 text-brand-700",
                  )}>
                    {r}
                  </span>
                ))}
                {user.isBlocked && (
                  <span className="rounded bg-danger-100 px-1.5 py-0.5 text-[10px] font-bold text-danger-700">
                    ЗАБЛОКИРОВАН
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Block / Unblock */}
          {user.isBlocked ? (
            <Button
              type="button"
              variant="brand"
              onClick={() => {
                if (confirm(`Снять блокировку с ${user.name}?`)) unblockMut.mutate();
              }}
              disabled={unblockMut.isPending}
            >
              <ShieldCheck className="h-4 w-4" />
              {unblockMut.isPending ? "Снимаем блок…" : "Разблокировать"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={() => setBlockOpen(true)}
            >
              <ShieldOff className="h-4 w-4" />
              Заблокировать
            </Button>
          )}
        </div>

        {/* Details grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-ink-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Телефон</p>
              <p className="text-[13px] font-bold text-ink-900">{user.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-accent-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Рейтинг</p>
              <p className="text-[13px] font-bold text-ink-900">
                {user.rating != null ? `${user.rating.toFixed(2)} (${user.ratingCount} отз.)` : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-ink-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Зарегистрирован</p>
              <p className="text-[13px] font-bold text-ink-900">{fmt(user.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Телефон верифицирован</p>
            <p className="text-[13px] font-bold text-ink-900">{fmt(user.phoneVerifiedAt)}</p>
          </div>
          {user.telegramId && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Telegram-бот (ID)</p>
              <p className="text-[13px] font-bold text-ink-900">{user.telegramId}</p>
            </div>
          )}
          {user.language && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Язык</p>
              <p className="text-[13px] font-bold text-ink-900">{user.language}</p>
            </div>
          )}
          {user.isBlocked && user.blockedReason && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Причина блокировки</p>
              <p className="text-[13px] font-bold text-danger-700">{user.blockedReason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Driver profile */}
      {user.driverProfile && (
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Профиль водителя
          </p>
          <div className="flex items-center gap-3">
            <Car className="h-5 w-5 text-ink-400" />
            <div>
              <p className="font-bold text-ink-900">
                {user.driverProfile.carPlate || "Номер не указан"}
              </p>
              <span className={cn(
                "text-[12px] font-bold",
                user.driverProfile.verificationStatus === "verified" ? "text-brand-600" :
                user.driverProfile.verificationStatus === "rejected" ? "text-danger-600" :
                user.driverProfile.verificationStatus === "pending" ? "text-accent-600" :
                "text-ink-500",
              )}>
                Верификация: {user.driverProfile.verificationStatus}
              </span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Всего поездок</p>
              <p className="text-[14px] font-bold text-ink-900">{user.driverProfile.totalTrips}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Отмены (30 дн.)</p>
              <p className="text-[14px] font-bold text-ink-900">{user.driverProfile.cancellations30d}</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity: the user's own trips (driver) + requests (passenger) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Поездки водителя ({user.trips.length})
          </p>
          {user.trips.length === 0 ? (
            <p className="text-[13px] text-ink-400">Нет поездок</p>
          ) : (
            <div className="space-y-1.5">
              {user.trips.map((t) => (
                <button key={t.id} type="button" onClick={() => setViewTrip(t.id)} className="flex w-full items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-left hover:bg-ink-100">
                  <span className="min-w-0 truncate text-[13px] font-semibold text-ink-800">{t.originCity} → {t.destinationCity}</span>
                  <span className="ml-2 flex shrink-0 items-center gap-2 text-[12px] text-ink-500">
                    {fmtDay(t.departureAt)}
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", statusTone(t.status))}>{t.status}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Заявки пассажира ({user.requests.length})
          </p>
          {user.requests.length === 0 ? (
            <p className="text-[13px] text-ink-400">Нет заявок</p>
          ) : (
            <div className="space-y-1.5">
              {user.requests.map((r) => (
                <button key={r.id} type="button" onClick={() => setViewRequest(r.id)} className="flex w-full items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-left hover:bg-ink-100">
                  <span className="min-w-0 truncate text-[13px] font-semibold text-ink-800">{r.originCity} → {r.destinationCity}</span>
                  <span className="ml-2 flex shrink-0 items-center gap-2 text-[12px] text-ink-500">
                    {fmtDay(r.departureDate)}
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", statusTone(r.status))}>{r.status}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Block modal */}
      {blockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-disp font-extrabold text-ink-900">Заблокировать пользователя</h2>
              <button type="button" onClick={() => setBlockOpen(false)} className="rounded-full p-1 hover:bg-ink-100">
                <X className="h-5 w-5 text-ink-400" />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-ink-500">
              <span className="font-bold text-ink-700">{user.name}</span> потеряет доступ к платформе и получит уведомление.
            </p>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-500">
              Причина блокировки *
            </p>
            <div className="mb-3 space-y-1.5">
              {BLOCK_REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-100 px-4 py-2.5 hover:bg-ink-50">
                  <input
                    type="radio"
                    name="block_reason"
                    value={r}
                    checked={blockReason === r}
                    onChange={() => setBlockReason(r)}
                    className="h-4 w-4"
                  />
                  <span className="text-[13px] font-semibold text-ink-700">{r}</span>
                </label>
              ))}
            </div>
            {blockReason === "Другое" && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Укажите причину…"
                className="mb-3 w-full rounded-xl border border-ink-200 p-3 text-[13px] outline-none focus:border-ink-400"
              />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setBlockOpen(false)}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="danger"
                size="lg"
                onClick={() => blockMut.mutate()}
                disabled={effectiveReason.trim().length < 3 || blockMut.isPending}
                className="flex-1"
              >
                {blockMut.isPending ? "Блокируем…" : "Заблокировать"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar lightbox — bigger photo */}
      {avatarOpen && avatarSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6" onClick={() => setAvatarOpen(false)}>
          <button type="button" onClick={() => setAvatarOpen(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-6 w-6" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarSrc} alt={user.name} onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain" />
        </div>
      )}

      {/* Trip detail — opens right here (reuses the Trips panel), no navigation */}
      {viewTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewTrip(null)}>
          <div className="max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-lift" onClick={(e) => e.stopPropagation()}>
            {tripQuery.data ? (
              <TripDetailPanel
                detail={tripQuery.data}
                isLoading={false}
                onClose={() => setViewTrip(null)}
                onForceCancel={(t) => setCancelTarget({ kind: "trip", id: t.id, title: `${t.originCity} → ${t.destinationCity}` })}
              />
            ) : tripQuery.isError ? (
              <div className="w-[440px] p-6 text-center text-[13px] text-ink-500">Не удалось загрузить поездку</div>
            ) : (
              <div className="flex h-64 w-[440px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-ink-200 border-t-ink-700" /></div>
            )}
          </div>
        </div>
      )}

      {/* Request detail — opens right here, no navigation */}
      {viewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewRequest(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-white p-5 shadow-lift" onClick={(e) => e.stopPropagation()}>
            {reqQuery.data ? (
              <>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h2 className="text-[19px] font-extrabold text-ink-900">{reqQuery.data.originCity} → {reqQuery.data.destinationCity}</h2>
                    <p className="text-[13px] text-ink-500">{fmt(reqQuery.data.departureDate)} · {reqQuery.data.seatsNeeded} мест</p>
                  </div>
                  <button type="button" onClick={() => setViewRequest(null)} className="rounded-full p-1 hover:bg-ink-100"><X className="h-5 w-5 text-ink-400" /></button>
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <StatusBadge status={reqQuery.data.status === "open" ? "active" : reqQuery.data.status === "cancelled" ? "rejected" : "completed"} label={reqQuery.data.status} />
                  {reqQuery.data.flexible && <span className="text-[12px] text-ink-500">± гибкая дата</span>}
                </div>
                <div className="mb-3 rounded-xl bg-ink-50 p-3 text-[13px]">
                  <p className="font-bold text-ink-900">{reqQuery.data.passenger.name}</p>
                  <p className="text-ink-500">{reqQuery.data.passenger.phone}</p>
                  {reqQuery.data.comment && <p className="mt-1 text-ink-600">«{reqQuery.data.comment}»</p>}
                </div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">Предложения водителей ({reqQuery.data.offers.length})</p>
                {reqQuery.data.offers.length === 0 ? (
                  <p className="text-[13px] text-ink-400">Пока нет предложений</p>
                ) : (
                  <div className="space-y-1.5">
                    {reqQuery.data.offers.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-[13px]">
                        <span className="font-semibold text-ink-800">{o.driverName}</span>
                        <span className="font-bold text-sky-600">{o.price} сом</span>
                      </div>
                    ))}
                  </div>
                )}
                {reqQuery.data.status === "open" && (
                  <Button variant="danger" size="lg" className="mt-4 w-full" onClick={() => setCancelTarget({ kind: "request", id: reqQuery.data!.id, title: `${reqQuery.data!.originCity} → ${reqQuery.data!.destinationCity}` })}>
                    Отменить заявку
                  </Button>
                )}
              </>
            ) : reqQuery.isError ? (
              <p className="py-10 text-center text-[13px] text-ink-500">Не удалось загрузить заявку</p>
            ) : (
              <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-ink-200 border-t-ink-700" /></div>
            )}
          </div>
        </div>
      )}

      {/* Force-cancel with message (trips + requests) */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4" onClick={() => setCancelTarget(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[19px] font-extrabold text-ink-900">{cancelTarget.kind === "trip" ? "Отменить поездку" : "Отменить заявку"}</h2>
              <button type="button" onClick={() => setCancelTarget(null)} className="rounded-full p-1 hover:bg-ink-100"><X className="h-5 w-5 text-ink-400" /></button>
            </div>
            <p className="mb-4 text-[13px] text-ink-500">{cancelTarget.title}. Пользователь получит сообщение с причиной.</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {CANCEL_REASONS.map((rr) => (
                <button key={rr} type="button" onClick={() => setCxReason(rr)} className={cn("rounded-full border-2 px-3 py-1.5 text-[13px] font-bold transition", cxReason === rr ? "border-danger-500 bg-danger-50 text-danger-700" : "border-ink-200 text-ink-600 hover:bg-ink-50")}>{rr}</button>
              ))}
            </div>
            {cxReason === "Другое" && (
              <textarea value={cxCustom} onChange={(e) => setCxCustom(e.target.value)} rows={3} maxLength={500} placeholder="Сообщение пользователю…" className="mb-3 w-full rounded-xl border-2 border-ink-200 px-3 py-2 text-[14px] outline-none focus:border-danger-400" />
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelTarget(null)}>Отмена</Button>
              <Button variant="danger" className="flex-[2]" disabled={cxEffective.length < 3 || cancelMut.isPending} onClick={() => cancelMut.mutate({ kind: cancelTarget.kind, id: cancelTarget.id, reason: cxEffective })}>
                {cancelMut.isPending ? "Отмена…" : "Отменить и уведомить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
