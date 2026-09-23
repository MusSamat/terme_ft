"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Car as CarIcon, Minus, Plus } from "lucide-react";
import { type CarCreateInput, listCarBrands, listCarModels, listCarColors } from "@/lib/api/cars";
import { isPlateValid, normalizePlate } from "@/lib/utils/plate";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

// The ONE car block — same fields + validation everywhere: inline in trip
// creation, in profile «Мои авто», and in driver verification (with `showYear`).
// Pass `onSubmit`+`submitLabel` for a self-contained form, or `onChange` to lift
// the values into a parent wizard (verification supplies its own «Далее»).

export interface CarValues {
  make: string;
  model: string;
  color: string;
  plate: string;
  year: string;
  seatsCount: number;
  valid: boolean;
}

const MIN_YEAR = 2000;
// Backend accepts up to currentYear + 1 (next model-year cars), so mirror that.
const MAX_YEAR = new Date().getFullYear() + 1;
// Year options, newest first (a plain year selector — no month/day).
const YEAR_OPTIONS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => String(MAX_YEAR - i));
function yearValid(year: string): boolean {
  const y = Number(year);
  return /^\d{4}$/.test(year.trim()) && y >= MIN_YEAR && y <= MAX_YEAR;
}

const FIELD =
  "h-11 w-full rounded-xl border-2 border-ink-200 bg-ink-50 px-3 text-[15px] font-700 text-ink-900 outline-none transition-colors focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white";

interface Props {
  onSubmit?: (input: CarCreateInput) => void;
  onChange?: (v: CarValues) => void;
  pending?: boolean;
  submitLabel?: string;
  /** Show the manufacture-year field (captured on every car so verification pre-fills it). */
  showYear?: boolean;
  /** Make the year mandatory for validity (verification requires it; elsewhere it's optional). */
  requireYear?: boolean;
  /** Make the colour mandatory (driver verification requires carColor; the garage doesn't). */
  requireColor?: boolean;
  /** Prefill (e.g. selecting an existing car in verification). Pair with a
      React `key` on the component to re-seed the fields per selection. */
  initial?: Partial<Omit<CarValues, "valid">>;
  className?: string;
}

export function CarForm({ onSubmit, onChange, pending, submitLabel, showYear, requireYear, requireColor, initial, className }: Props) {
  const t = useTranslations("cars");
  const tReg = useTranslations("driver_reg");
  const locale = useLocale();
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [plate, setPlate] = useState(initial?.plate ?? "");
  const [year, setYear] = useState(initial?.year ?? "");
  const [seats, setSeats] = useState(initial?.seatsCount ?? 4);

  // Catalog pickers — start in manual mode when prefilling an existing car.
  const [brandId, setBrandId] = useState<number | null>(null);
  const [brandManual, setBrandManual] = useState(Boolean(initial?.make));
  const [modelManual, setModelManual] = useState(Boolean(initial?.model));
  const [colorManual, setColorManual] = useState(false);
  const { data: colors = [] } = useQuery({ queryKey: ["car-colors"], queryFn: listCarColors, staleTime: 60 * 60_000 });
  const { data: brands = [] } = useQuery({ queryKey: ["car-brands"], queryFn: listCarBrands, staleTime: 60 * 60_000 });
  const { data: models = [] } = useQuery({
    queryKey: ["car-models", brandId],
    queryFn: () => listCarModels(brandId!),
    enabled: brandId != null,
    staleTime: 60 * 60_000,
  });

  const plateOk = isPlateValid(plate);
  // Year is optional almost everywhere; verification passes requireYear.
  const yearOk = requireYear ? yearValid(year) : !year.trim() || yearValid(year);
  // Colour is optional in the garage but required by driver verification.
  const colorOk = requireColor ? Boolean(color.trim()) : true;
  const valid = Boolean(make.trim() && model.trim() && plateOk && yearOk && colorOk);

  // Colour: selected catalog entry (for the swatch preview) + manual fallback
  // when the user opts out or a prefilled car uses an off-catalog colour.
  const selectedColor = colors.find((c) => c.nameRu === color);
  const showColorManual = colorManual || (Boolean(color.trim()) && colors.length > 0 && !selectedColor);

  // Lift the current values into a parent wizard (verification) when controlled.
  useEffect(() => {
    onChange?.({ make: make.trim(), model: model.trim(), color: color.trim(), plate, year: year.trim(), seatsCount: seats, valid });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [make, model, color, plate, year, seats, valid]);

  return (
    <div className={cn("space-y-2.5", className)}>
      {/* Brand → model pickers (catalog) with a free-text fallback. Native
          <select> works in every WebView incl. Telegram (datalist does not).
          Saved as text either way — the catalog is only an input aid. */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          {brandManual ? (
            <>
              <input value={make} onChange={(e) => setMake(e.target.value)} placeholder={t("make_ph")} className={FIELD} />
              {brands.length > 0 && (
                <button type="button" onClick={() => { setBrandManual(false); setMake(""); setBrandId(null); }} className="mt-1 text-[12px] font-700 text-brand-600">
                  {t("from_list")}
                </button>
              )}
            </>
          ) : (
            <select
              value={brandId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__manual__") { setBrandManual(true); setModelManual(true); setBrandId(null); setMake(""); setModel(""); }
                else if (v === "") { setBrandId(null); setMake(""); setModel(""); }
                else { const b = brands.find((x) => String(x.id) === v); setBrandId(b?.id ?? null); setMake(b?.name ?? ""); setModel(""); setModelManual(false); }
              }}
              className={FIELD}
            >
              <option value="">{t("make_ph")}</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              <option value="__manual__">{t("manual_entry")}</option>
            </select>
          )}
        </div>
        <div>
          {brandManual || modelManual ? (
            <>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={t("model_ph")} className={FIELD} />
              {!brandManual && models.length > 0 && (
                <button type="button" onClick={() => { setModelManual(false); setModel(""); }} className="mt-1 text-[12px] font-700 text-brand-600">
                  {t("from_list")}
                </button>
              )}
            </>
          ) : (
            <select
              value={model}
              disabled={brandId == null}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__manual__") { setModelManual(true); setModel(""); }
                else setModel(v);
              }}
              className={FIELD}
            >
              <option value="">{t("model_ph")}</option>
              {models.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              <option value="__manual__">{t("manual_entry")}</option>
            </select>
          )}
        </div>
      </div>
      {/* Colour — a select like the brand picker: localized name options + a
          hex swatch preview of the choice, with a free-text fallback. The value
          saved on the car is the canonical Russian name. */}
      {showColorManual ? (
        <div>
          <input value={color} onChange={(e) => setColor(e.target.value)} placeholder={t("color_ph")} className={FIELD} />
          {colors.length > 0 && (
            <button type="button" onClick={() => { setColorManual(false); setColor(""); }} className="mt-1 text-[12px] font-700 text-brand-600">
              {t("from_list")}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span
            className="h-11 w-11 shrink-0 rounded-xl border-2 border-ink-200 dark:border-ink-600"
            style={selectedColor ? { background: selectedColor.hex } : undefined}
          />
          <select
            value={color}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__manual__") { setColorManual(true); setColor(""); }
              else setColor(v);
            }}
            className={cn(FIELD, "flex-1")}
          >
            <option value="">{t("color_ph")}</option>
            {colors.map((c) => (
              <option key={c.id} value={c.nameRu}>{locale === "ky" ? c.nameKy : c.nameRu}</option>
            ))}
            <option value="__manual__">{t("manual_entry")}</option>
          </select>
        </div>
      )}
      <input
        value={plate}
        onChange={(e) => setPlate(normalizePlate(e.target.value))}
        placeholder={t("plate_ph")}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={10}
        className={cn(FIELD, "uppercase tracking-wider", plate && !plateOk && "border-coral-400 dark:border-coral-400")}
      />
      {plate && !plateOk && (
        <p className="text-[13px] font-700 text-coral-500">{t("plate_hint")}</p>
      )}
      {showYear && (
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className={cn(FIELD, requireYear && !year && "border-coral-400 dark:border-coral-400")}
        >
          <option value="">{tReg("year_placeholder")}</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      )}
      {/* Seats — compact stepper row */}
      <div className="flex h-11 items-center justify-between rounded-xl border-2 border-ink-200 bg-ink-50 px-3 dark:border-ink-700 dark:bg-ink-800">
        <span className="text-[15px] font-700 text-ink-600 dark:text-ink-300">{t("seats_label")}</span>
        <span className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="−"
            disabled={seats <= 1}
            onClick={() => setSeats((s) => Math.max(1, s - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink-600 ring-1 ring-ink-200 disabled:opacity-35 dark:bg-ink-900 dark:text-ink-300 dark:ring-ink-700"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span className="min-w-[20px] text-center text-[17px] font-900 text-ink-900 dark:text-white">{seats}</span>
          <button
            type="button"
            aria-label="+"
            disabled={seats >= 7}
            onClick={() => setSeats((s) => Math.min(7, s + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand-600 ring-1 ring-ink-200 disabled:opacity-35 dark:bg-ink-900 dark:text-brand-300 dark:ring-ink-700"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
      {/* Self-contained mode: a submit button. Controlled mode (verification)
          omits submitLabel and drives the values via onChange. */}
      {submitLabel && (
        <button
          type="button"
          disabled={!valid || pending}
          onClick={() =>
            onSubmit?.({
              make: make.trim(),
              model: model.trim(),
              color: color.trim() || undefined,
              year: year.trim() ? Number(year) : undefined,
              plate,
              seatsCount: seats,
            })
          }
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-800 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
        >
          {pending ? <Spinner size={16} /> : <CarIcon className="h-4 w-4" aria-hidden="true" />}
          {submitLabel}
        </button>
      )}
    </div>
  );
}
