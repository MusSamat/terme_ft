"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listAdminUsers, type AdminUserItem } from "@/lib/api/admin";
import { normalizeMediaUrl } from "@/lib/utils/media-url";
import { StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { Search, ChevronRight, ChevronLeft, Star, Car } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { AdminQueryError } from "@/components/admin/admin-query-error";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "driver" | "passenger">("");
  const [blockedFilter, setBlockedFilter] = useState<"" | "true" | "false">("");
  const [sort, setSort] = useState<"created_desc" | "created_asc" | "rating_desc" | "rating_asc">("created_desc");
  const [regFrom, setRegFrom] = useState("");
  const [regTo, setRegTo] = useState("");
  const debouncedQ = useDebounce(q, 300);

  // Cursor stack for prev/next paging; reset whenever a filter changes.
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors[cursors.length - 1];
  useEffect(() => {
    setCursors([]);
  }, [debouncedQ, roleFilter, blockedFilter, sort, regFrom, regTo]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "users", debouncedQ, roleFilter, blockedFilter, sort, regFrom, regTo, cursor],
    queryFn: () =>
      listAdminUsers({
        q: debouncedQ || undefined,
        role: roleFilter || undefined,
        blocked: (blockedFilter || undefined) as "true" | "false" | undefined,
        sort,
        registered_from: regFrom ? new Date(`${regFrom}T00:00:00`).toISOString() : undefined,
        registered_to: regTo ? new Date(`${regTo}T23:59:59`).toISOString() : undefined,
        cursor,
        limit: 20,
      }),
    staleTime: 30_000,
  });

  const items: AdminUserItem[] = data?.data ?? [];
  const hasNext = !!data?.nextCursor;
  const hasPrev = cursors.length > 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-disp font-extrabold text-ink-900">Пользователи</h1>
        <p className="text-[13px] text-ink-500">Поиск и управление аккаунтами</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Имя или телефон…"
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-9 pr-4 text-[13px] outline-none focus:border-ink-400"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "" | "driver" | "passenger")}
          className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-[13px] outline-none focus:border-ink-400"
        >
          <option value="">Все роли</option>
          <option value="driver">Водители</option>
          <option value="passenger">Пассажиры</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-[13px] outline-none focus:border-ink-400"
        >
          <option value="created_desc">Сначала новые</option>
          <option value="created_asc">Сначала старые</option>
          <option value="rating_desc">Рейтинг ↓</option>
          <option value="rating_asc">Рейтинг ↑</option>
        </select>
        <label className="flex items-center gap-1 text-[12px] font-bold text-ink-500">
          Регистрация с
          <input type="date" value={regFrom} onChange={(e) => setRegFrom(e.target.value)}
            className="rounded-xl border border-ink-200 bg-white px-2 py-2 text-[13px] outline-none focus:border-ink-400" />
        </label>
        <label className="flex items-center gap-1 text-[12px] font-bold text-ink-500">
          по
          <input type="date" value={regTo} onChange={(e) => setRegTo(e.target.value)}
            className="rounded-xl border border-ink-200 bg-white px-2 py-2 text-[13px] outline-none focus:border-ink-400" />
        </label>
        <select
          value={blockedFilter}
          onChange={(e) => setBlockedFilter(e.target.value as "" | "true" | "false")}
          className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-[13px] outline-none focus:border-ink-400"
        >
          <option value="">Все статусы</option>
          <option value="false">Активные</option>
          <option value="true">Заблокированные</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : isError ? (
        <AdminQueryError error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center">
          <p className="font-bold text-ink-600">Пользователи не найдены</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-400">
                  Пользователь
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-400 sm:table-cell">
                  Роли
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-400 md:table-cell">
                  Рейтинг
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-400 lg:table-cell">
                  Поездки
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-400 lg:table-cell">
                  Зарег.
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-400 xl:table-cell">
                  Активность
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-400">
                  Статус
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {items.map((u) => (
                <tr key={u.id} className="group hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={normalizeMediaUrl(u.avatarUrl) ?? u.avatarUrl}
                          alt=""
                          className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink-200 text-[12px] font-bold text-ink-600">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-ink-900">
                          {u.name}
                          <span className="ml-1.5 align-middle text-[10px] font-bold uppercase text-ink-400">
                            {u.language}
                          </span>
                        </p>
                        <p className="text-[11px] text-ink-500">
                          {u.phoneConfirmed ? u.phone : "⚠ номер не подтверждён"}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold",
                            r === "driver"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-brand-100 text-brand-700",
                          )}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {u.rating != null ? (
                      <div className="flex items-center gap-1 text-[13px]">
                        <Star className="h-3 w-3 fill-accent-400 text-accent-400" />
                        <span className="font-bold">{u.rating.toFixed(1)}</span>
                        <span className="text-ink-400">({u.ratingCount})</span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-ink-400">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {u.totalTrips != null ? (
                      <div className="flex items-center gap-1 text-[13px]">
                        <Car className="h-3 w-3 text-ink-400" />
                        <span className="font-bold text-ink-700">{u.totalTrips}</span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-ink-400">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-[13px] text-ink-500 lg:table-cell">
                    {fmt(u.createdAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-[13px] text-ink-500 xl:table-cell">
                    {u.lastSeenAt ? fmt(u.lastSeenAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {u.isBlocked ? (
                      <StatusBadge status="rejected" label="Блок" />
                    ) : (
                      <StatusBadge status="active" label="Активен" />
                    )}
                    {u.complaintsCount > 0 && (
                      <span className="ml-1 rounded-full bg-danger-100 px-1.5 py-0.5 text-[10px] font-bold text-danger-700">
                        {u.complaintsCount} жал.
                      </span>
                    )}
                  </td>
                  <td className="pr-4">
                    <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-ink-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(hasPrev || hasNext) && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => setCursors((p) => p.slice(0, -1))}
            className="flex items-center gap-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Назад
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => {
              if (data?.nextCursor) setCursors((p) => [...p, data.nextCursor!]);
            }}
            className="flex items-center gap-1 rounded-xl border border-ink-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-40"
          >
            Вперёд <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
