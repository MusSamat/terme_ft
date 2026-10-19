"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Clock, Plane, PlaneLanding, PlaneTakeoff, RotateCcw } from "lucide-react";
import { getPickupSuggestion, type Airport, type FlightType } from "@/lib/api/cities";
import { airportTitle, collidesWithAirport, kgIso, splitKg } from "@/lib/airport";
import { placeName, placeSubtitle, toRoutePlace } from "@/lib/places";
import { formatDurationMin } from "@/lib/utils/date";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/i18n.config";
import type { AirportPlan } from "./airport-plan";

export const FLIGHT_RE = /^[A-Z0-9]{2}\s?\d{1,4}[A-Z]?$/;

const kgToday = () => new Date(Date.now() + 6 * 3_600_000).toISOString().slice(0, 10);

const card = "rounded-3xl bg-white p-4 shadow-card ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800";
const stepTitle = "mb-2.5 flex items-center gap-2 text-[15px] font-900 text-ink-900 dark:text-white";
const input =
  "h-11 w-full rounded-xl border border-ink-200 bg-ink-50 px-3 text-[16px] font-800 text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:text-white";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <h2 className={stepTitle}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-900 text-white">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Airport transfer in 3 steps — airport → direction → the other end — then the
 * flight (date/time, flight type) with the suggested pickup and an optional
 * flight number. Controlled: the parent owns the plan.
 */
export function AirportWizard({
  airports,
  plan,
  setPlan,
}: {
  airports: Airport[];
  plan: AirportPlan;
  setPlan: Dispatch<SetStateAction<AirportPlan>>;
}) {
  const t = useTranslations("airport");
  const locale = useLocale() as Locale;
  const airport = airports.find((a) => a.id === plan.airportId) ?? null;
  const flightType: FlightType = plan.flightType ?? airport?.flightType ?? "domestic";

  // Changing the flight / place resets a hand-edited pickup to the new estimate.
  const update = (u: Partial<AirportPlan>) => setPlan((p) => ({ ...p, ...u, pickupEdited: false }));

  const pickAirport = (a: Airport) =>
    setPlan((p) => ({
      ...p,
      airportId: a.id,
      flightType: null,
      pickupEdited: false,
      // The other end defaults to the served city (Манас → Бишкек).
      other: a.serves ? toRoutePlace(a.serves) : null,
      flightDate: p.flightDate || kgToday(),
    }));

  const suggestKey =
    plan.toAirport && airport && plan.other?.id && plan.flightDate && plan.flightTime
      ? { airportId: airport.id, from_id: plan.other.id, flight_time: kgIso(plan.flightDate, plan.flightTime), flight_type: flightType }
      : null;
  const suggestion = useQuery({
    queryKey: ["pickup-suggestion", suggestKey],
    queryFn: () => {
      const { airportId, ...params } = suggestKey!;
      return getPickupSuggestion(airportId, params);
    },
    enabled: suggestKey !== null,
    staleTime: 10 * 60_000,
  });
  const suggestedAt = suggestion.data?.pickupAt;
  const keyStr = JSON.stringify(suggestKey);
  // New inputs → drop the old estimate (unless the user set the time); the
  // fresh one lands right after. Order matters: reset first, then apply.
  useEffect(() => {
    setPlan((p) => (p.pickupEdited || !p.pickup ? p : { ...p, pickup: null }));
  }, [keyStr, setPlan]);
  useEffect(() => {
    if (suggestKey && suggestedAt) setPlan((p) => (p.pickupEdited ? p : { ...p, pickup: splitKg(suggestedAt) }));
    // suggestKey is covered by keyStr.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedAt, keyStr, setPlan]);

  const flightInvalid = plan.flightNumber.trim() !== "" && !FLIGHT_RE.test(plan.flightNumber.trim().toUpperCase());

  return (
    <div className="space-y-3">
      <Step n={1} title={t("step_airport")}>
        <div className="grid grid-cols-2 gap-2.5">
          {airports.map((a) => {
            const on = a.id === plan.airportId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => pickAirport(a)}
                aria-pressed={on}
                className={cn(
                  "flex min-h-[88px] flex-col items-start justify-between gap-2 rounded-2xl p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  on
                    ? "bg-brand-600 text-white"
                    : "bg-ink-50 text-ink-900 hover:bg-ink-100 dark:bg-ink-800 dark:text-white dark:hover:bg-ink-700",
                )}
              >
                <Plane className={cn("h-6 w-6", on ? "text-white" : "text-brand-600")} aria-hidden="true" />
                <span className="text-[16px] font-900 leading-tight">{airportTitle(a, locale)}</span>
              </button>
            );
          })}
        </div>
      </Step>

      {airport && (
        <Step n={2} title={t("step_direction")}>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800">
            {[true, false].map((dir) => {
              const Icon = dir ? PlaneTakeoff : PlaneLanding;
              return (
                <button
                  key={String(dir)}
                  type="button"
                  onClick={() => update({ toAirport: dir })}
                  aria-pressed={plan.toAirport === dir}
                  className={cn(
                    "flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14.5px] font-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    plan.toAirport === dir ? "bg-white text-ink-900 shadow-card dark:bg-ink-900 dark:text-white" : "text-ink-500 dark:text-ink-400",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {dir ? t("to_airport") : t("from_airport")}
                </button>
              );
            })}
          </div>
        </Step>
      )}

      {airport && plan.toAirport !== null && (
        <Step n={3} title={plan.toAirport ? t("step_from") : t("step_to")}>
          <CityAutocomplete
            transferEnd
            value={plan.other}
            onChange={(v) => v && update({ other: toRoutePlace(v) })}
            placeholder={t("other_placeholder")}
          />
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {airport.popularDestinations.map((p) => {
              const on = p.id === plan.other?.id;
              const sub = collidesWithAirport(p, airports, locale) ? placeSubtitle(p, locale) : "";
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => update({ other: toRoutePlace(p) })}
                  aria-pressed={on}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    on
                      ? "bg-brand-600 text-white"
                      : "bg-ink-100 text-ink-800 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700",
                  )}
                >
                  <span className="block text-[13.5px] font-800">{placeName(p, locale)}</span>
                  {sub && (
                    <span className={cn("block text-[11px] font-700", on ? "text-white/80" : "text-ink-500 dark:text-ink-400")}>
                      {sub}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Step>
      )}

      {airport && plan.toAirport !== null && plan.other && (
        <Step n={4} title={plan.toAirport ? t("step_flight_departure") : t("step_flight_arrival")}>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-800 text-ink-500">{t("flight_date")}</span>
              <input
                type="date"
                min={kgToday()}
                value={plan.flightDate}
                onChange={(e) => update({ flightDate: e.target.value })}
                className={input}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-800 text-ink-500">
                {plan.toAirport ? t("flight_departs") : t("flight_arrives")}
              </span>
              <input
                type="time"
                value={plan.flightTime}
                onChange={(e) => update({ flightTime: e.target.value })}
                className={input}
              />
            </label>
          </div>

          {plan.toAirport && (
            <div role="group" aria-label={t("flight_type_aria")} className="mt-2.5 grid grid-cols-2 gap-1 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800">
              {(["international", "domestic"] as const).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => update({ flightType: ft })}
                  aria-pressed={flightType === ft}
                  className={cn(
                    "h-9 rounded-xl text-[13px] font-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    flightType === ft ? "bg-white text-ink-900 shadow-card dark:bg-ink-900 dark:text-white" : "text-ink-500 dark:text-ink-400",
                  )}
                >
                  {t(ft === "international" ? "flight_intl" : "flight_domestic")}
                </button>
              ))}
            </div>
          )}

          {plan.toAirport && plan.flightTime && (
            <PickupCard
              plan={plan}
              loading={suggestion.isFetching && !plan.pickup}
              failed={suggestion.isError}
              travelMin={suggestion.data?.travelMin ?? null}
              bufferMin={suggestion.data?.bufferMin ?? airport.departureBufferMin[flightType]}
              onEdit={(time) =>
                setPlan((p) => ({ ...p, pickup: { date: p.pickup?.date ?? p.flightDate, time }, pickupEdited: true }))
              }
              onReset={() => setPlan((p) => ({ ...p, pickupEdited: false, pickup: suggestedAt ? splitKg(suggestedAt) : null }))}
            />
          )}
          {!plan.toAirport && plan.flightTime && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-brand-50 px-3.5 py-2.5 text-[13.5px] font-700 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
              <PlaneLanding className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-900">{t("arrival_line", { time: plan.flightTime })}</span> — {t("arrival_hint")}
              </span>
            </p>
          )}
        </Step>
      )}

      {airport && plan.toAirport !== null && plan.other && plan.flightTime && (
        <Step n={5} title={t("step_flight_number")}>
          <input
            value={plan.flightNumber}
            onChange={(e) => setPlan((p) => ({ ...p, flightNumber: e.target.value.toUpperCase().slice(0, 10) }))}
            placeholder={t("flight_number_ph")}
            aria-invalid={flightInvalid}
            className={cn(input, "uppercase tracking-wide")}
          />
          <p className={cn("mt-1.5 text-[12.5px] font-600", flightInvalid ? "text-danger-600" : "text-ink-500")}>
            {t("flight_number_hint")}
          </p>
        </Step>
      )}
    </div>
  );
}

function PickupCard({
  plan,
  loading,
  failed,
  travelMin,
  bufferMin,
  onEdit,
  onReset,
}: {
  plan: AirportPlan;
  loading: boolean;
  failed: boolean;
  travelMin: number | null;
  bufferMin: number;
  onEdit: (time: string) => void;
  onReset: () => void;
}) {
  const t = useTranslations("airport");
  const locale = useLocale() as Locale;
  const p = plan.pickup;
  return (
    <div className="mt-3 rounded-2xl bg-brand-50 p-3.5 dark:bg-brand-500/10">
      <div className="flex items-center gap-2.5">
        <Clock className="h-5 w-5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-[14.5px] font-900 text-brand-900 dark:text-brand-100" aria-live="polite">
          {loading
            ? t("pickup_loading")
            : p
              ? t("pickup_line", { time: p.time })
              : failed
                ? t("pickup_manual")
                : t("pickup_loading")}
          {p && p.date !== plan.flightDate && <span className="ml-1 font-700">({t("pickup_prev_day")})</span>}
        </p>
      </div>
      {p && !plan.pickupEdited && travelMin !== null && (
        <p className="mt-1 pl-[30px] text-[12.5px] font-700 text-brand-800/80 dark:text-brand-200/80">
          {t("pickup_details", { travel: formatDurationMin(travelMin, locale), buffer: formatDurationMin(bufferMin, locale) })}
        </p>
      )}
      <div className="mt-2.5 flex items-center gap-2 pl-[30px]">
        <label className="flex items-center gap-2 text-[12.5px] font-800 text-ink-600 dark:text-ink-300">
          {t("pickup_edit")}
          <input
            type="time"
            value={p?.time ?? ""}
            onChange={(e) => e.target.value && onEdit(e.target.value)}
            className="h-9 rounded-lg border border-ink-200 bg-white px-2 text-[14px] font-800 text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
        </label>
        {plan.pickupEdited && !failed && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[12.5px] font-800 text-brand-700 dark:text-brand-300"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("pickup_reset")}
          </button>
        )}
      </div>
    </div>
  );
}
