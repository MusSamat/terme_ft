"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAdminCarBrands,
  createCarBrand,
  updateCarBrand,
  deleteCarBrand,
  listAdminCarModels,
  createCarModel,
  updateCarModel,
  deleteCarModel,
  listAdminCarColors,
  createCarColor,
  updateCarColor,
  deleteCarColor,
  type CarBrandItem,
  type CarModelItem,
  type CarColorItem,
} from "@/lib/api/admin";
import { useAdminAuth } from "@/store/admin-auth";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { AdminQueryError, toastAdminError } from "@/components/admin/admin-query-error";

type Tab = "brands" | "models" | "colors";

export default function CarCatalogPage() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === "superadmin";
  const [tab, setTab] = useState<Tab>("brands");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-disp font-extrabold text-ink-900">Автокаталог</h1>
        <p className="text-[13px] text-ink-500">
          {isSuperAdmin
            ? "Марки, модели и цвета для подсказок при добавлении авто"
            : "Только просмотр (нет прав суперадмина)"}
        </p>
      </div>

      <div className="mb-5 inline-flex rounded-xl bg-ink-100 p-1">
        {(
          [
            ["brands", "Марки"],
            ["models", "Модели"],
            ["colors", "Цвета"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-[13px] font-bold transition",
              tab === key ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "brands" && <BrandsTab isSuperAdmin={isSuperAdmin} />}
      {tab === "models" && <ModelsTab isSuperAdmin={isSuperAdmin} />}
      {tab === "colors" && <ColorsTab isSuperAdmin={isSuperAdmin} />}
    </div>
  );
}

// ─── shared bits ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-accent-200 px-3 py-1.5 text-[13px] outline-none focus:border-accent-400";

function ActiveDot({ on }: { on: boolean }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", on ? "bg-brand-500" : "bg-ink-300")} />;
}

function RowActions({
  onEdit,
  onDelete,
  deleting,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function SaveCancel({
  onSave,
  onCancel,
  disabled,
}: {
  onSave: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="rounded-lg bg-ink-900 p-1.5 text-white hover:bg-ink-800 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-ink-200 p-1.5 text-ink-600 hover:bg-ink-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-ink-100">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-50">{children}</tbody>
      </table>
    </div>
  );
}

function AddButton({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <div className="mb-3">
      <Button type="button" variant="invert" onClick={onClick}>
        <Plus className="h-4 w-4" />
        Добавить
      </Button>
    </div>
  );
}

// ─── Brands ──────────────────────────────────────────────────────────────────

function BrandEditRow({
  brand,
  onSave,
  onCancel,
  saving,
}: {
  brand: Partial<CarBrandItem>;
  onSave: (d: { name: string; sortPosition: number; isActive: boolean }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(brand.name ?? "");
  const [sort, setSort] = useState(String(brand.sortPosition ?? ""));
  const [isActive, setIsActive] = useState(brand.isActive ?? true);
  return (
    <tr className="bg-accent-50">
      <td className="px-4 py-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Марка" className={inputCls} />
      </td>
      <td className="px-4 py-2">
        <input
          value={sort}
          onChange={(e) => setSort(e.target.value.replace(/\D/g, ""))}
          placeholder="№"
          className={cn(inputCls, "w-20")}
        />
      </td>
      <td className="px-4 py-2 text-center">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
      </td>
      <td className="px-4 py-2">
        <SaveCancel
          disabled={!name.trim() || saving}
          onCancel={onCancel}
          onSave={() => onSave({ name: name.trim(), sortPosition: Number(sort || 0), isActive })}
        />
      </td>
    </tr>
  );
}

function BrandsTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["admin", "car-brands"], queryFn: listAdminCarBrands });
  // Models cascade on brand delete and show the brand name — refresh both.
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "car-brands"] });
    void qc.invalidateQueries({ queryKey: ["admin", "car-models"] });
  };

  const createMut = useMutation({
    mutationFn: (input: { name: string; sortPosition: number; isActive: boolean }) => createCarBrand(input),
    onSuccess: () => { invalidate(); setAdding(false); },
    onError: toastAdminError,
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof updateCarBrand>[1] }) =>
      updateCarBrand(id, input),
    onSuccess: () => { invalidate(); setEditingId(null); },
    onError: toastAdminError,
  });
  const deleteMut = useMutation({ mutationFn: deleteCarBrand, onSuccess: invalidate, onError: toastAdminError });

  const brands = data?.data ?? [];
  const headers = ["Марка", "№", "Активна", isSuperAdmin ? "Действия" : ""];

  if (isLoading) return <SkeletonRows />;
  if (isError) return <AdminQueryError error={error} onRetry={() => void refetch()} />;
  return (
    <>
      <AddButton show={isSuperAdmin && !adding} onClick={() => setAdding(true)} />
      <TableShell headers={headers}>
        {adding && (
          <BrandEditRow
            brand={{}}
            saving={createMut.isPending}
            onCancel={() => setAdding(false)}
            onSave={(d) => createMut.mutate(d)}
          />
        )}
        {brands.map((b) =>
          editingId === b.id ? (
            <BrandEditRow
              key={b.id}
              brand={b}
              saving={updateMut.isPending}
              onCancel={() => setEditingId(null)}
              onSave={(d) => updateMut.mutate({ id: b.id, input: d })}
            />
          ) : (
            <tr key={b.id} className="hover:bg-ink-50">
              <td className="px-4 py-3 font-bold text-ink-900">{b.name}</td>
              <td className="px-4 py-3 text-[13px] text-ink-500">{b.sortPosition}</td>
              <td className="px-4 py-3 text-center"><ActiveDot on={b.isActive} /></td>
              <td className="px-4 py-3">
                {isSuperAdmin && (
                  <RowActions
                    deleting={deleteMut.isPending}
                    onEdit={() => setEditingId(b.id)}
                    onDelete={() => {
                      if (confirm(`Удалить марку «${b.name}» и все её модели?`)) deleteMut.mutate(b.id);
                    }}
                  />
                )}
              </td>
            </tr>
          ),
        )}
      </TableShell>
    </>
  );
}

// ─── Models ──────────────────────────────────────────────────────────────────

function ModelEditRow({
  model,
  brands,
  onSave,
  onCancel,
  saving,
}: {
  model: Partial<CarModelItem>;
  brands: CarBrandItem[];
  onSave: (d: { brandId: number; name: string; bodyType?: string; sortPosition: number; isActive: boolean }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [brandId, setBrandId] = useState(model.brandId ?? brands[0]?.id ?? 0);
  const [name, setName] = useState(model.name ?? "");
  const [bodyType, setBodyType] = useState(model.bodyType ?? "");
  const [sort, setSort] = useState(String(model.sortPosition ?? ""));
  const [isActive, setIsActive] = useState(model.isActive ?? true);
  return (
    <tr className="bg-accent-50">
      <td className="px-4 py-2">
        <select value={brandId} onChange={(e) => setBrandId(Number(e.target.value))} className={inputCls}>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Модель" className={inputCls} />
      </td>
      <td className="px-4 py-2">
        <input value={bodyType} onChange={(e) => setBodyType(e.target.value)} placeholder="Кузов" className={inputCls} />
      </td>
      <td className="px-4 py-2">
        <input
          value={sort}
          onChange={(e) => setSort(e.target.value.replace(/\D/g, ""))}
          placeholder="№"
          className={cn(inputCls, "w-20")}
        />
      </td>
      <td className="px-4 py-2 text-center">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
      </td>
      <td className="px-4 py-2">
        <SaveCancel
          disabled={!name.trim() || !brandId || saving}
          onCancel={onCancel}
          onSave={() =>
            onSave({ brandId, name: name.trim(), bodyType: bodyType.trim() || undefined, sortPosition: Number(sort || 0), isActive })
          }
        />
      </td>
    </tr>
  );
}

function ModelsTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterBrand, setFilterBrand] = useState<number | "">("");

  const brandsQ = useQuery({ queryKey: ["admin", "car-brands"], queryFn: listAdminCarBrands });
  const brands = brandsQ.data?.data ?? [];
  const brandName = (id: number) => brands.find((b) => b.id === id)?.name ?? `#${id}`;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "car-models", filterBrand],
    queryFn: () => listAdminCarModels(filterBrand === "" ? undefined : filterBrand),
  });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin", "car-models"] });

  const createMut = useMutation({
    mutationFn: (input: Parameters<typeof createCarModel>[0]) => createCarModel(input),
    onSuccess: () => { invalidate(); setAdding(false); },
    onError: toastAdminError,
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof updateCarModel>[1] }) =>
      updateCarModel(id, input),
    onSuccess: () => { invalidate(); setEditingId(null); },
    onError: toastAdminError,
  });
  const deleteMut = useMutation({ mutationFn: deleteCarModel, onSuccess: invalidate, onError: toastAdminError });

  const models = data?.data ?? [];
  const headers = ["Марка", "Модель", "Кузов", "№", "Активна", isSuperAdmin ? "Действия" : ""];

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <AddButton show={isSuperAdmin && !adding && brands.length > 0} onClick={() => setAdding(true)} />
        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value === "" ? "" : Number(e.target.value))}
          className={cn(inputCls, "w-auto")}
        >
          <option value="">Все марки</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <AdminQueryError error={error} onRetry={() => void refetch()} />
      ) : (
        <TableShell headers={headers}>
          {adding && (
            <ModelEditRow
              model={filterBrand === "" ? {} : { brandId: filterBrand }}
              brands={brands}
              saving={createMut.isPending}
              onCancel={() => setAdding(false)}
              onSave={(d) => createMut.mutate(d)}
            />
          )}
          {models.map((m) =>
            editingId === m.id ? (
              <ModelEditRow
                key={m.id}
                model={m}
                brands={brands}
                saving={updateMut.isPending}
                onCancel={() => setEditingId(null)}
                onSave={(d) => updateMut.mutate({ id: m.id, input: d })}
              />
            ) : (
              <tr key={m.id} className="hover:bg-ink-50">
                <td className="px-4 py-3 text-[13px] text-ink-600">{brandName(m.brandId)}</td>
                <td className="px-4 py-3 font-bold text-ink-900">{m.name}</td>
                <td className="px-4 py-3 text-[13px] text-ink-500">{m.bodyType ?? "—"}</td>
                <td className="px-4 py-3 text-[13px] text-ink-500">{m.sortPosition}</td>
                <td className="px-4 py-3 text-center"><ActiveDot on={m.isActive} /></td>
                <td className="px-4 py-3">
                  {isSuperAdmin && (
                    <RowActions
                      deleting={deleteMut.isPending}
                      onEdit={() => setEditingId(m.id)}
                      onDelete={() => {
                        if (confirm(`Удалить модель «${m.name}»?`)) deleteMut.mutate(m.id);
                      }}
                    />
                  )}
                </td>
              </tr>
            ),
          )}
        </TableShell>
      )}
    </>
  );
}

// ─── Colors ──────────────────────────────────────────────────────────────────

function ColorEditRow({
  color,
  onSave,
  onCancel,
  saving,
}: {
  color: Partial<CarColorItem>;
  onSave: (d: { nameRu: string; nameKy: string; hexCode: string; sortPosition: number; isActive: boolean }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [nameRu, setNameRu] = useState(color.nameRu ?? "");
  const [nameKy, setNameKy] = useState(color.nameKy ?? "");
  const [hex, setHex] = useState(color.hexCode ?? "#000000");
  const [sort, setSort] = useState(String(color.sortPosition ?? ""));
  const [isActive, setIsActive] = useState(color.isActive ?? true);
  const validHex = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex);
  return (
    <tr className="bg-accent-50">
      <td className="px-4 py-2">
        <input value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder="Цвет (рус)" className={inputCls} />
      </td>
      <td className="px-4 py-2">
        <input value={nameKy} onChange={(e) => setNameKy(e.target.value)} placeholder="Цвет (кырг)" className={inputCls} />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={validHex ? hex.slice(0, 7) : "#000000"}
            onChange={(e) => setHex(e.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded border border-ink-200"
          />
          <input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#RRGGBB" className={cn(inputCls, "w-28")} />
        </div>
      </td>
      <td className="px-4 py-2">
        <input
          value={sort}
          onChange={(e) => setSort(e.target.value.replace(/\D/g, ""))}
          placeholder="№"
          className={cn(inputCls, "w-20")}
        />
      </td>
      <td className="px-4 py-2 text-center">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
      </td>
      <td className="px-4 py-2">
        <SaveCancel
          disabled={!nameRu.trim() || !nameKy.trim() || !validHex || saving}
          onCancel={onCancel}
          onSave={() =>
            onSave({ nameRu: nameRu.trim(), nameKy: nameKy.trim(), hexCode: hex, sortPosition: Number(sort || 0), isActive })
          }
        />
      </td>
    </tr>
  );
}

function ColorsTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["admin", "car-colors"], queryFn: listAdminCarColors });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin", "car-colors"] });

  const createMut = useMutation({
    mutationFn: (input: Parameters<typeof createCarColor>[0]) => createCarColor(input),
    onSuccess: () => { invalidate(); setAdding(false); },
    onError: toastAdminError,
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof updateCarColor>[1] }) =>
      updateCarColor(id, input),
    onSuccess: () => { invalidate(); setEditingId(null); },
    onError: toastAdminError,
  });
  const deleteMut = useMutation({ mutationFn: deleteCarColor, onSuccess: invalidate, onError: toastAdminError });

  const colors = data?.data ?? [];
  const headers = ["Цвет (рус)", "Цвет (кырг)", "HEX", "№", "Активен", isSuperAdmin ? "Действия" : ""];

  if (isLoading) return <SkeletonRows />;
  if (isError) return <AdminQueryError error={error} onRetry={() => void refetch()} />;
  return (
    <>
      <AddButton show={isSuperAdmin && !adding} onClick={() => setAdding(true)} />
      <TableShell headers={headers}>
        {adding && (
          <ColorEditRow
            color={{}}
            saving={createMut.isPending}
            onCancel={() => setAdding(false)}
            onSave={(d) => createMut.mutate(d)}
          />
        )}
        {colors.map((c) =>
          editingId === c.id ? (
            <ColorEditRow
              key={c.id}
              color={c}
              saving={updateMut.isPending}
              onCancel={() => setEditingId(null)}
              onSave={(d) => updateMut.mutate({ id: c.id, input: d })}
            />
          ) : (
            <tr key={c.id} className="hover:bg-ink-50">
              <td className="px-4 py-3 font-bold text-ink-900">{c.nameRu}</td>
              <td className="px-4 py-3 text-[13px] text-ink-600">{c.nameKy}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-ink-200"
                    style={{ backgroundColor: c.hexCode }}
                  />
                  <span className="font-mono text-[12px] text-ink-500">{c.hexCode}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-[13px] text-ink-500">{c.sortPosition}</td>
              <td className="px-4 py-3 text-center"><ActiveDot on={c.isActive} /></td>
              <td className="px-4 py-3">
                {isSuperAdmin && (
                  <RowActions
                    deleting={deleteMut.isPending}
                    onEdit={() => setEditingId(c.id)}
                    onDelete={() => {
                      if (confirm(`Удалить цвет «${c.nameRu}»?`)) deleteMut.mutate(c.id);
                    }}
                  />
                )}
              </td>
            </tr>
          ),
        )}
      </TableShell>
    </>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-white" />
      ))}
    </div>
  );
}
