"use client";

import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAdminCities, updateCity, type CityItem, type PlaceType } from "@/lib/api/admin";
import { extractError } from "@/lib/api/client";
import { useAdminAuth } from "@/store/admin-auth";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { toastSuccess } from "@/components/layout/quick-toast";
import { Button } from "@/components/ui";
import { PointPickerMap, type MapPoint } from "@/components/map";
import { cn } from "@/lib/utils/cn";
import { MapPin, Pencil, Search, X } from "lucide-react";

const TYPE_LABELS: Record<PlaceType, string> = {
  oblast: "Область",
  capital: "Столица",
  city_district: "Район города",
  raion: "Район",
  city: "Город",
  town: "ПГТ",
  aiyl_aimak: "Айыл аймак",
  village: "Село",
  airport: "Аэропорт",
};

const KG_CENTER: MapPoint = { lat: 41.4, lng: 74.6 };

function area(c: CityItem): string {
  return [c.raion?.nameRu, c.oblast?.nameRu].filter(Boolean).join(", ");
}

function EditPanel({ city, onClose }: { city: CityItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [nameRu, setNameRu] = useState(city.nameRu);
  const [nameKg, setNameKg] = useState(city.nameKg);
  const [aliases, setAliases] = useState(city.aliases.join(", "));
  const [isActive, setIsActive] = useState(city.isActive);
  const [point, setPoint] = useState<MapPoint | null>(
    city.lat != null && city.lng != null ? { lat: city.lat, lng: city.lng } : null,
  );
  const [pointTouched, setPointTouched] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      updateCity(city.id, {
        nameRu: nameRu.trim(),
        nameKg: nameKg.trim(),
        aliases: aliases
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        isActive,
        ...(pointTouched && point ? { lat: point.lat, lng: point.lng } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "cities"] });
      toastSuccess("Сохранено");
      onClose();
    },
  });
  const err = save.error ? extractError(save.error) : null;

  const input =
    "w-full rounded-lg border border-ink-200 px-3 py-2 text-[14px] outline-none focus:border-brand-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-ink-900/40"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-extrabold text-ink-900">{city.nameRu}</h2>
            <p className="text-[12px] text-ink-500">
              {TYPE_LABELS[city.type]} · СОАТЕ {city.soateCode}
              {area(city) && ` · ${area(city)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-[12px] font-bold text-ink-500">
            Название (рус)
            <input
              value={nameRu}
              onChange={(e) => setNameRu(e.target.value)}
              className={cn(input, "mt-1")}
            />
          </label>
          <label className="block text-[12px] font-bold text-ink-500">
            Название (кырг)
            <input
              value={nameKg}
              onChange={(e) => setNameKg(e.target.value)}
              className={cn(input, "mt-1")}
            />
          </label>
          <label className="block text-[12px] font-bold text-ink-500">
            Синонимы для поиска (через запятую)
            <input
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="Фрунзе, Pishpek"
              className={cn(input, "mt-1")}
            />
          </label>
          <label className="flex items-center gap-2 text-[14px] font-semibold text-ink-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            Активен (виден в поиске)
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between text-[12px] font-bold text-ink-500">
              <span>Точка на карте</span>
              {city.coordApprox && !pointTouched && (
                <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] text-accent-700">
                  приблизительно — уточните
                </span>
              )}
            </div>
            <div className="h-72 overflow-hidden rounded-xl">
              <PointPickerMap
                value={point}
                center={point ?? KG_CENTER}
                onChange={(p) => {
                  setPoint(p);
                  setPointTouched(true);
                }}
                className="h-full"
              />
            </div>
            <p className="mt-1 text-[12px] text-ink-400">
              {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Нет координат"} ·
              нажмите или перетащите метку
            </p>
          </div>
        </div>

        {err && <p className="mt-3 text-[13px] font-semibold text-coral-600">{err.message}</p>}
        <div className="mt-auto flex gap-2 pt-5">
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={!nameRu.trim() || !nameKg.trim() || save.isPending}
            className="flex-1"
          >
            Сохранить
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCitiesPage() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === "superadmin";
  const [q, setQ] = useState("");
  const [type, setType] = useState<PlaceType | "">("");
  const [approx, setApprox] = useState(false);
  const [editing, setEditing] = useState<CityItem | null>(null);
  const dq = useDebounce(q.trim(), 300);

  const query = useInfiniteQuery({
    queryKey: ["admin", "cities", dq, type, approx],
    queryFn: ({ pageParam }) =>
      listAdminCities({
        q: dq || undefined,
        type: type || undefined,
        approx: approx || undefined,
        cursor: pageParam,
        limit: 50,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });
  const rows = query.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="font-disp text-[24px] font-extrabold text-ink-900">
          Справочник мест (СОАТЕ)
        </h1>
        <p className="text-[13px] text-ink-500">
          {isSuperAdmin
            ? "Поиск по названию, синонимам или коду СОАТЕ. Исправляйте названия и точки на карте."
            : "Только просмотр (нет прав суперадмина)"}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Каракол, Ак-Суу, 41702…"
            className="h-10 w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 text-[14px] outline-none focus:border-brand-400"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PlaceType | "")}
          className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-[14px]"
        >
          <option value="">Все типы</option>
          {(Object.keys(TYPE_LABELS) as PlaceType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-[14px] font-semibold text-ink-700">
          <input
            type="checkbox"
            checked={approx}
            onChange={(e) => setApprox(e.target.checked)}
            className="h-4 w-4"
          />
          Только приблизительные точки
        </label>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="rounded-2xl bg-white p-6 text-center text-[14px] text-coral-600 shadow-card">
          {extractError(query.error).message}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-[14px] text-ink-500 shadow-card">
          Ничего не найдено
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-ink-100">
                {[
                  "Название (рус)",
                  "Название (кырг)",
                  "Тип",
                  "Район, область",
                  "Точка",
                  "Активен",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <div className="font-bold text-ink-900">{c.nameRu}</div>
                    {c.aliases.length > 0 && (
                      <div className="text-[11px] text-ink-400">{c.aliases.join(", ")}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-600">{c.nameKg}</td>
                  <td className="px-4 py-3 text-[13px] text-ink-500">{TYPE_LABELS[c.type]}</td>
                  <td className="px-4 py-3 text-[13px] text-ink-500">{area(c) || "—"}</td>
                  <td className="px-4 py-3 text-[12px]">
                    {c.lat == null ? (
                      <span className="text-ink-300">—</span>
                    ) : (
                      <span
                        className={cn(
                          "flex items-center gap-1",
                          c.coordApprox ? "text-accent-600" : "text-brand-600",
                        )}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {c.coordApprox ? "≈" : "точно"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        c.isActive ? "bg-brand-500" : "bg-ink-300",
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        aria-label="Редактировать"
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {query.hasNextPage && (
            <div className="border-t border-ink-100 p-3 text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                Показать ещё
              </Button>
            </div>
          )}
        </div>
      )}

      {editing && <EditPanel city={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
