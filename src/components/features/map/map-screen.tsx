"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUpDown, CalendarDays, LocateFixed, Plane } from "lucide-react";
import { CityPickerField } from "@/components/ui/city-picker-field";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { CarGlyph } from "@/components/icons/car-glyph";
import { PassengerGlyph } from "@/components/icons/passenger-glyph";
import { nearestPlace } from "@/lib/api/cities";
import { inKg } from "@/lib/geo";
import { routeFromParams, setRouteParams, toRoutePlace, type RoutePlace } from "@/lib/places";
import { addRecentRoute, saveLastRoute } from "@/lib/recent-routes";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils/cn";
import { useMapLocation } from "./use-map-location";
import { LocationCard } from "./location-prompt";

const ymdKg = (offset = 0) =>
  new Date(Date.now() + 6 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);

type Kind = "trips" | "requests";

/** Results URL for a route in the «Карта» view (the regular search flow). */
export function routeMapHref(
  kind: Kind,
  from: RoutePlace,
  to: RoutePlace,
  opts: { date: string; seats?: number; airport?: boolean },
): string {
  const qs = new URLSearchParams();
  setRouteParams(qs, from, to);
  qs.set("date", opts.date);
  if (kind === "trips" && opts.seats && opts.seats > 1) qs.set("seats", String(opts.seats));
  if (kind === "trips" && opts.airport) qs.set("kind", "airport");
  qs.set("view", "map");
  return `/${kind}?${qs.toString()}`;
}

// /map — route first (no browse-everything map): «Откуда» / «Куда» → results
// in the «Карта» view. Geolocation only pre-fills «Откуда» with the nearest
// settlement, after the pre-permission card; the form never waits for it.
export function MapScreen() {
  const t = useTranslations("map");
  const router = useRouter();
  const sp = useSearchParams();
  const mode = useAuth((s) => s.activeMode);

  const initial = routeFromParams((k) => sp.get(k));
  const [kindPick, setKindPick] = useState<Kind | null>(
    sp.get("kind") === "requests" ? "requests" : sp.get("kind") === "trips" ? "trips" : null,
  );
  const kind: Kind = kindPick ?? (mode === "driver" ? "requests" : "trips");
  const [airport, setAirport] = useState(sp.get("ride") === "airport");
  const [from, setFrom] = useState<RoutePlace | null>(initial.from);
  const [fromNearby, setFromNearby] = useState(false);
  const [to, setTo] = useState<RoutePlace | null>(initial.to);
  const [date, setDate] = useState("any");
  const [seats, setSeats] = useState(1);

  // Old /map?from…&to… links → straight to the results map.
  useEffect(() => {
    if (initial.from && initial.to) {
      router.replace(routeMapHref(kind, initial.from, initial.to, { date: sp.get("date") ?? "any", airport }));
    }
    // Once, on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loc = useMapLocation();
  const userPickedFrom = useRef(Boolean(initial.from));
  useEffect(() => {
    const me = loc.me;
    if (!me || !inKg(me) || userPickedFrom.current) return;
    let alive = true;
    nearestPlace(me.lat, me.lng)
      .then((p) => {
        if (!alive || !p || userPickedFrom.current) return;
        setFrom(toRoutePlace(p));
        setFromNearby(true);
      })
      .catch(() => {
        /* the user just picks «Откуда» by hand */
      });
    return () => {
      alive = false;
    };
  }, [loc.me]);

  const pickFrom = (p: RoutePlace | null) => {
    userPickedFrom.current = true;
    setFromNearby(false);
    setFrom(p);
  };
  const swap = () => {
    userPickedFrom.current = true;
    setFromNearby(false);
    setFrom(to);
    setTo(from);
  };

  const ready = Boolean(from && to);
  const submit = () => {
    if (!from || !to) return;
    addRecentRoute(from, to);
    saveLastRoute(from, to);
    router.push(routeMapHref(kind, from, to, { date, seats, airport }));
  };

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-4 px-4 py-5 md:py-10">
      <h1 className="text-[24px] font-900 text-ink-900 dark:text-white">{t("form_title")}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3 rounded-3xl bg-white p-4 shadow-card ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800"
      >
        <div role="group" aria-label={`${t("tab_trips")} / ${t("tab_requests")}`} className="grid grid-cols-2 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800">
          {(["trips", "requests"] as const).map((k) => {
            const Glyph = k === "trips" ? CarGlyph : PassengerGlyph;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKindPick(k)}
                aria-pressed={kind === k}
                className={cn(
                  "flex h-9 items-center justify-center gap-1.5 rounded-xl text-[13.5px] font-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  kind === k ? "bg-brand-600 text-white" : "text-ink-500 dark:text-ink-400",
                )}
              >
                <Glyph size={18} />
                {k === "trips" ? t("tab_trips") : t("tab_requests")}
              </button>
            );
          })}
        </div>

        <div className="relative space-y-2">
          <div>
            <CityPickerField value={from} placeholder={t("from_placeholder")} onChange={(p) => pickFrom(toRoutePlace(p))} />
            {fromNearby && (
              <p className="mt-1 flex items-center gap-1 pl-1 text-[12px] font-800 text-brand-700 dark:text-brand-300">
                <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" /> {t("near_you")}
              </p>
            )}
          </div>
          <CityPickerField value={to} placeholder={t("to_placeholder")} onChange={(p) => setTo(toRoutePlace(p))} />
          <button
            type="button"
            onClick={swap}
            aria-label={t("swap")}
            className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-600 shadow-card ring-1 ring-ink-200 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-ink-800 dark:text-ink-200 dark:ring-ink-700"
          >
            <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          <Chip kind="filter" selected={date === "any"} onClick={() => setDate("any")}>
            {t("any_day")}
          </Chip>
          <Chip kind="filter" selected={date === ymdKg(0)} onClick={() => setDate(ymdKg(0))}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {t("today")}
          </Chip>
          <Chip kind="filter" selected={date === ymdKg(1)} onClick={() => setDate(ymdKg(1))}>
            {t("tomorrow")}
          </Chip>
          {kind === "trips" && (
            <Chip kind="filter" selected={airport} onClick={() => setAirport((v) => !v)}>
              <Plane className="h-3.5 w-3.5" aria-hidden="true" /> {t("airport")}
            </Chip>
          )}
        </div>

        {kind === "trips" && (
          <div className="flex items-center justify-between gap-3">
            <span id="map-seats-label" className="text-[13.5px] font-800 text-ink-600 dark:text-ink-300">
              {t("seats_label")}
            </span>
            <div role="group" aria-labelledby="map-seats-label" className="flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <Chip key={n} kind="filter" selected={seats === n} onClick={() => setSeats(n)}>
                  {n}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={!ready}>
          {t("submit")}
        </Button>
      </form>

      {loc.cardOpen && (
        <LocationCard
          denied={loc.perm === "denied"}
          failed={loc.failed}
          locating={loc.locating}
          onAllow={loc.request}
          onLater={loc.dismissCard}
        />
      )}

      {!ready && (
        <div className="flex flex-col items-center gap-3 px-6 py-6 text-center">
          <div className="flex items-center gap-3 text-brand-600" aria-hidden="true">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15">
              <CarGlyph size={30} />
            </span>
            <span className="h-0.5 w-10 rounded-full bg-brand-200 dark:bg-brand-800" />
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15">
              <PassengerGlyph size={30} />
            </span>
          </div>
          <p className="max-w-[360px] text-[14px] font-700 leading-relaxed text-ink-500 dark:text-ink-400">{t("form_hint")}</p>
        </div>
      )}
    </div>
  );
}
