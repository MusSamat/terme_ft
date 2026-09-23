"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CarFront, User, PartyPopper, ShieldCheck, Phone, ChevronRight, ChevronDown, Check, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { createTrip, type CreateTripInput } from "@/lib/api/trips-create";
import { uuid } from "@/lib/utils/uuid";
import { createPassengerRequest, type CreatePassengerRequestInput } from "@/lib/api/passenger-requests";
import { addCar, listMyCars } from "@/lib/api/cars";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { useAuth } from "@/store/auth";
import { ROLE_THEME } from "@/lib/role-colors";
import { Modal, ModalContent, ModalTitle } from "@/components/ui/modal";
import { IntentToggle } from "@/components/features/search/intent-toggle";
import { saveDeferredAction } from "@/lib/auth/deferred-action";
import { Spinner } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { ActionModal } from "@/components/ui/action-modal";
import type { ChipAccent } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { AddPhoneModal } from "@/components/features/auth/add-phone-modal";
import { CarForm } from "@/components/features/cars/car-form";
import { VerificationCard } from "@/components/features/driver/verification-card";
import { RouteCard } from "./route-card";
import { PickupZones } from "./pickup-zones";
import { WhenChips } from "./when-chips";
import { SeatsStepper } from "./seats-stepper";
import { PriceCard } from "./price-card";
import { PrefsCollapsible, PREF_KEYS, type PrefKey } from "./prefs-collapsible";

// Unified single-scroll create form — design-spec §2.4. Driver publishes a
// trip, passenger publishes a request; the variant is chosen by useUiRole.
// All create mutations / draft-persistence / phone + verification gating are
// preserved — this is a presentational collapse of the old multi-step wizard.

interface Draft {
  originCity: string;
  destinationCity: string;
  pickup: string[];
  dropoff: string[];
  date: string;
  time: string;
  timeEnd: string; // "" = exact time; else «выезжаем time–timeEnd» (driver only)
  flexible: boolean;
  seats: number;
  price: number;
  comment: string;
  prefs: Record<PrefKey, boolean>;
}

function emptyPrefs(): Record<PrefKey, boolean> {
  const p = {} as Record<PrefKey, boolean>;
  for (const k of PREF_KEYS) p[k] = false;
  p.clean = true;
  p.no_smoking = true;
  return p;
}

function defaults(isDriver: boolean): Draft {
  return {
    originCity: "",
    destinationCity: "",
    pickup: [],
    dropoff: [],
    date: "",
    time: "09:00",
    timeEnd: "",
    flexible: false,
    // Driver: placeholder until the car's capacity loads (see effect below).
    // Passenger: most requests are for one seat.
    seats: isDriver ? 3 : 1,
    // Passenger budget starts empty (0) — so it's only folded into the comment
    // when the user actually types one (parity with Flutter's empty field).
    price: isDriver ? 1200 : 0,
    comment: "",
    prefs: emptyPrefs(),
  };
}

function dstr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0]!;
}

interface Props {
  initialFrom?: string;
  initialTo?: string;
}

export function CreateScreen({ initialFrom, initialTo }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useTranslations("create");
  const tCars = useTranslations("cars");
  const fe = useFriendlyError();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  // Phase 1: no account roles — the user picks the intent right here.
  const activeMode = useAuth((s) => s.activeMode);
  const setActiveMode = useAuth((s) => s.setActiveMode);
  const [intent, setIntent] = useState<"driver" | "passenger">(
    activeMode === "driver" ? "driver" : "passenger",
  );
  const isDriver = intent === "driver";
  const role = intent;
  const theme = ROLE_THEME[intent];
  const draftKey = isDriver ? "terme_trip_draft" : "terme_req_draft";
  const chipAccent: ChipAccent = isDriver ? "brand" : "grape";

  const [draft, setDraft] = useState<Draft>(() => defaults(isDriver));
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  // Guest gate (proper gate screen lands in a later batch — this is the seam).
  useEffect(() => {
    if (status === "anonymous") {
      // Return the guest to the create screen after login — not a bogus
      // /trips//book URL (empty trip_id) from a book_trip intent.
      saveDeferredAction({ action: "create_trip" });
      router.replace("/auth/login");
    }
  }, [status, router]);


  // Whether the user (or a persisted draft) already chose a seat count — the
  // car-capacity default below must never override an explicit choice.
  const seatsCustomized = useRef(false);
  // Stable across retries of one submit → a lost-response retry replays the same
  // trip instead of duplicating; reset after a successful publish.
  const idempotencyKeyRef = useRef(uuid());

  // Load persisted draft (preserve existing localStorage keys).
  useEffect(() => {
    const base = defaults(isDriver);
    base.date = dstr(1);
    try {
      const raw = localStorage.getItem(draftKey);
      const saved = raw ? (JSON.parse(raw) as Partial<Draft>) : {};
      seatsCustomized.current = saved.seats !== undefined;
      const merged: Draft = { ...base, ...saved, prefs: { ...base.prefs, ...(saved.prefs ?? {}) } };
      if (initialFrom) merged.originCity = initialFrom;
      if (initialTo) merged.destinationCity = initialTo;
      setDraft(merged);
    } catch {
      setDraft(base);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriver, draftKey]);

  const patch = (u: Partial<Draft>) =>
    setDraft((prev) => {
      const next = { ...prev, ...u };
      try {
        localStorage.setItem(draftKey, JSON.stringify(next));
      } catch {
        /* ignore quota / private-mode */
      }
      return next;
    });

  // Phase 1: publishing needs a car, not verification. The user's garage:
  const { data: cars = [], isLoading: carsLoading } = useQuery({
    queryKey: ["cars", "my"],
    queryFn: listMyCars,
    enabled: isDriver && status === "authenticated",
    staleTime: 30_000,
  });
  const [carId, setCarId] = useState<string | null>(null);
  const [addingCar, setAddingCar] = useState(false);
  const [carSheetOpen, setCarSheetOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false); // «Дополнительно» accordion — collapsed by default
  const selectedCar = cars.find((c) => c.id === carId) ?? cars[cars.length - 1] ?? null;
  const addCarMut = useMutation({
    mutationFn: addCar,
    onSuccess: (c) => {
      setCarId(c.id);
      setAddingCar(false);
      void qc.invalidateQueries({ queryKey: ["cars", "my"] });
    },
    onError: (e) => setCreateError(fe(extractError(e))),
  });

  // Default seats to the car's capacity from the driver profile («Мест» in the
  // account) — unless the user or a saved draft already chose a count.
  const carSeats = selectedCar?.seatsCount;
  useEffect(() => {
    if (!isDriver || !carSeats || seatsCustomized.current) return;
    setDraft((prev) => ({ ...prev, seats: Math.min(Math.max(carSeats, 1), 7) }));
  }, [isDriver, carSeats]);

  const departureAt = (): string => {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(draft.date) ? draft.date : dstr(1);
    const time = draft.flexible ? "12:00" : draft.time;
    // Anchor to Kyrgyzstan time (+06:00), NOT the device's local zone: the
    // wall-clock the user picked is a KG time. `.toISOString()` on a
    // local-parsed Date would shift the instant for non-UTC+6 devices.
    return `${day}T${time}:00+06:00`;
  };

  // Window end is meaningful only for exact-time driver trips and only when it
  // is actually after the start (string compare works for HH:MM).
  const departureWindowEnd = (): string | undefined => {
    if (draft.flexible || !draft.timeEnd || draft.timeEnd <= draft.time) return undefined;
    const day = /^\d{4}-\d{2}-\d{2}$/.test(draft.date) ? draft.date : dstr(1);
    return `${day}T${draft.timeEnd}:00+06:00`; // KG time, not device-local
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async (): Promise<string> => {
      if (isDriver) {
        const input: CreateTripInput = {
          originCity: draft.originCity,
          destinationCity: draft.destinationCity,
          pickupCities: draft.pickup,
          dropoffCities: draft.dropoff,
          originAddress: draft.originCity,
          carId: selectedCar?.id,
          departureAt: departureAt(),
          departureWindowEnd: departureWindowEnd(),
          departureFlexible: draft.flexible,
          seatsTotal: draft.seats,
          pricePerSeat: draft.price,
          priceNegotiable: false,
          luggage: "small",
          comment: draft.comment || undefined,
          preferences: {
            clean: draft.prefs.clean,
            music: draft.prefs.music,
            smoking: !draft.prefs.no_smoking,
            ac: draft.prefs.ac,
            animals: draft.prefs.pets,
            quiet: draft.prefs.quiet,
            chat: draft.prefs.chat,
            women_only: draft.prefs.women_only,
          },
        };
        const trip = await createTrip(input, idempotencyKeyRef.current);
        return trip.id ?? "";
      }
      // Passenger request — payload has no pickup/budget fields, so the budget
      // is folded into the comment to avoid losing it.
      const budgetNote = draft.price > 0 ? `${t("budget_note", { n: draft.price })} ` : "";
      const input: CreatePassengerRequestInput = {
        originCity: draft.originCity,
        destinationCity: draft.destinationCity,
        seatsNeeded: draft.seats,
        departureDate: departureAt(),
        flexible: draft.flexible,
        comment: (budgetNote + draft.comment).trim() || undefined,
      };
      const req = await createPassengerRequest(input);
      return req.id ?? "";
    },
    onSuccess: (id) => {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      // Publishing as a driver/passenger IS choosing that mode — sync the global
      // active mode so «Мои» opens the matching tab set (otherwise a trip created
      // while in passenger mode is hidden — passenger tabs have no «Поездки»).
      setActiveMode(intent);
      void qc.invalidateQueries({ queryKey: isDriver ? ["trips"] : ["passenger-requests"] });
      // The «Мои поездки / объявления» tab reads ["my-posts"] — invalidate it so
      // the just-published item appears immediately (not after a 15s staleTime).
      void qc.invalidateQueries({ queryKey: ["my-posts"] });
      idempotencyKeyRef.current = uuid(); // fresh key for a possible next publish
      setPublishedId(id);
    },
    onError: (e) => setCreateError(fe(extractError(e))),
  });

  // A non-flexible departure must be at least ~30 min out (backend rule). Catch
  // "today at a time already passed" on the client with a clear message instead
  // of a generic backend rejection.
  const departureTooSoon =
    !draft.flexible && Boolean(draft.date) && new Date(departureAt()).getTime() < Date.now() + 30 * 60_000;

  // Driver price must land in the backend range (pricePerSeat int 50..10000).
  // Show it inline rather than let the request 400 on the server.
  const priceOutOfRange = isDriver && (draft.price < 50 || draft.price > 10_000);
  const sameCity = Boolean(draft.originCity) && draft.originCity === draft.destinationCity;

  const canSubmit =
    Boolean(draft.originCity && draft.destinationCity && draft.originCity !== draft.destinationCity) &&
    (draft.flexible || Boolean(draft.date)) &&
    !departureTooSoon &&
    draft.seats >= 1 &&
    (!isDriver || !priceOutOfRange) &&
    // Driver intent needs a car (Phase 1 gate — inline form adds one below).
    (!isDriver || Boolean(selectedCar));

  if (status === "loading" || status === "idle" || status === "anonymous") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  // Phone required — block the form entirely (mirrors backend requirePhone 403).
  // Filling the form and only failing on submit was the bad UX; gate up front.
  if (status === "authenticated" && !user?.phoneVerified) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-8">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-ink-100 bg-white px-6 py-10 text-center dark:border-ink-800 dark:bg-ink-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Phone className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-[20px] font-900 text-ink-900 dark:text-white">{t("gate_phone_title")}</h1>
          <p className="max-w-[380px] text-[15px] font-600 text-ink-500 dark:text-ink-400">
            {isDriver ? t("gate_phone_text_driver") : t("gate_phone_text")}
          </p>
          <Button variant="brand" size="lg" className="mt-2 w-full max-w-[320px]" onClick={() => setShowAddPhone(true)}>
            {t("gate_phone_cta")}
          </Button>
        </div>
        <AddPhoneModal open={showAddPhone} onClose={() => setShowAddPhone(false)} onDone={() => setShowAddPhone(false)} />
      </div>
    );
  }

  const submitLabel = isDriver ? t("submit_driver") : t("submit_passenger");
  const submitBtn = (
    <Button
      variant={isDriver ? "brand" : "grape"}
      size="lg"
      className="w-full"
      disabled={!canSubmit || isPending}
      onClick={() => {
        setCreateError(null);
        mutate();
      }}
    >
      {isPending ? (
        <Spinner size={18} />
      ) : (
        <>
          {isDriver ? <CarFront className="h-5 w-5" aria-hidden="true" /> : <User className="h-5 w-5" aria-hidden="true" />}
          {submitLabel}
        </>
      )}
    </Button>
  );

  const form = (
    <div className="space-y-3.5">
      {/* Intent — chosen right here, no account role (Phase 1) */}
      <IntentToggle value={intent} onChange={setIntent} />
      <p className="text-[15px] font-700 text-ink-600 dark:text-ink-400">
        {isDriver ? t("intro_driver") : t("intro_passenger")}
      </p>

      <RouteCard
        origin={draft.originCity}
        destination={draft.destinationCity}
        onOrigin={(v) => patch({ originCity: v })}
        onDestination={(v) => patch({ destinationCity: v })}
        iconAccent={theme.iconAccent}
      />
      {sameCity && (
        <p className="-mt-1 text-[13px] font-700 text-coral-600">{t("err_same_city")}</p>
      )}
      {/* Driver intent: the trip rides on a car. First car is added inline; once
          the garage has cars, it's a compact row → selection sheet (mirrors the
          Flutter car sheet: many-option selectors are focused sheets). */}
      {isDriver && status === "authenticated" && !carsLoading && (
        cars.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800">
            <p className="text-[16px] font-900 text-ink-900 dark:text-white">{t("car_need_title")}</p>
            <p className="mb-3 mt-0.5 text-[14px] font-600 text-ink-500 dark:text-ink-400">{t("car_need_text")}</p>
            <CarForm className="mt-2" showYear onSubmit={(i) => addCarMut.mutate(i)} pending={addCarMut.isPending} submitLabel={t("car_add_btn")} />
            <VerificationCard variant="inline" />
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setCarSheetOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-2xl bg-white p-4 text-left shadow-xs ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800"
            >
              <CarFront className="h-5 w-5 shrink-0 text-grape-600" aria-hidden="true" />
              <span className="flex-1 truncate text-[16px] font-800 text-ink-900 dark:text-white">
                {selectedCar ? `${selectedCar.make} ${selectedCar.model}` : t("car_choose")}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />
            </button>
            <Modal open={carSheetOpen} onOpenChange={setCarSheetOpen}>
              <ModalContent className="max-w-md">
                <ModalTitle className="mb-3 text-[18px] font-900 text-ink-900 dark:text-white">{tCars("pick_title")}</ModalTitle>
                <div className="space-y-2">
                  {cars.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setAddingCar(false);
                        setCarId(c.id);
                        setCarSheetOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                        selectedCar?.id === c.id
                          ? "border-grape-500 bg-grape-50 dark:bg-grape-500/10"
                          : "border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800",
                      )}
                    >
                      <CarFront className="h-5 w-5 shrink-0 text-grape-600" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-800 text-ink-900 dark:text-white">{c.make} {c.model}</span>
                        <span className="block text-[13px] font-600 text-ink-500">{c.plate}</span>
                      </span>
                      {selectedCar?.id === c.id && <Check className="h-5 w-5 shrink-0 text-grape-600" aria-hidden="true" />}
                    </button>
                  ))}
                  {cars.length < 3 && (
                    <button
                      type="button"
                      onClick={() => setAddingCar((v) => !v)}
                      className="w-full rounded-2xl border border-dashed border-grape-400 p-3 text-[14px] font-800 text-grape-600"
                    >
                      + {tCars("add_another")}
                    </button>
                  )}
                  {addingCar && (
                    <CarForm className="mt-1" showYear onSubmit={(i) => addCarMut.mutate(i)} pending={addCarMut.isPending} submitLabel={t("car_add_btn")} />
                  )}
                </div>
              </ModalContent>
            </Modal>
            <VerificationCard variant="inline" />
          </>
        )
      )}
      <WhenChips
        date={draft.date}
        time={draft.time}
        flexible={draft.flexible}
        tomorrow={dstr(1)}
        dayAfter={dstr(2)}
        today={dstr(0)}
        accent={chipAccent}
        flexChip={theme.flexChip}
        onDate={(v) => patch({ date: v })}
        onTime={(v) => patch({ time: v })}
        onFlexible={(v) => patch({ flexible: v })}
        {...(isDriver ? { timeEnd: draft.timeEnd, onTimeEnd: (v: string) => patch({ timeEnd: v }) } : {})}
      />
      {departureTooSoon && (
        <p className="-mt-1 text-[13px] font-700 text-coral-600">{t("err_departure_soon")}</p>
      )}
      <SeatsStepper
        value={draft.seats}
        label={isDriver ? t("seats_label_driver") : t("seats_label_passenger")}
        // Driver can't offer more seats than the car has (backend 409s otherwise).
        max={isDriver ? Math.min(carSeats ?? 7, 7) : 8}
        hint={isDriver && carSeats ? t("seats_car_capacity", { n: carSeats }) : undefined}
        counterText={theme.counterText}
        onChange={(v) => {
          seatsCustomized.current = true;
          patch({ seats: v });
        }}
      />
      {/* Price is a driver essential (passenger sees it before booking); the
          passenger's optional budget lives in the collapsible below. */}
      {isDriver && (
        <>
          <PriceCard
            value={draft.price}
            label={t("price_label_driver")}
            onChange={(v) => patch({ price: v })}
          />
          {priceOutOfRange && (
            <p className="-mt-1 text-[13px] font-700 text-coral-600">{t("err_price_range")}</p>
          )}
        </>
      )}
    </div>
  );

  // Optional block — collapsibles only: passenger budget, intermediate cities,
  // preferences. Keeps the essentials above uncluttered (parity with Flutter).
  const optional = (
    <>
      {!isDriver && (
        <PriceCard
          value={draft.price}
          label={t("price_label_passenger")}
          onChange={(v) => patch({ price: v })}
        />
      )}
      {/* Intermediate cities are a DRIVER feature — the passenger-request API has
          no pickup/dropoff, so surfacing it to passengers would silently drop it. */}
      {isDriver && (
        <PickupZones
          role={role}
          pickup={draft.pickup}
          dropoff={draft.dropoff}
          onPickup={(v) => patch({ pickup: v })}
          onDropoff={(v) => patch({ dropoff: v })}
        />
      )}
      <PrefsCollapsible role={role} prefs={draft.prefs} onToggle={(k) => patch({ prefs: { ...draft.prefs, [k]: !draft.prefs[k] } })} />
    </>
  );

  // «Дополнительно» — one collapsible header over the whole optional block, so
  // the essentials above stay uncluttered (1:1 with the Flutter accordion).
  const moreBlock = (
    <div className="space-y-3.5">
      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        aria-expanded={moreOpen}
        className={cn("flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-[14px] font-800", theme.navPillOn, theme.textOn)}
      >
        <SlidersHorizontal className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        {t("more")}
        <ChevronDown className={cn("ml-auto h-5 w-5 shrink-0 transition-transform", moreOpen && "rotate-180")} aria-hidden="true" />
      </button>
      {moreOpen && optional}
    </div>
  );

  return (
    <>
      {/* ===== MOBILE ===== */}
      <div className="flex min-h-[calc(100vh-56px)] flex-col lg:hidden">
        <div className={cn("px-5 pb-4 pt-11 text-white", theme.headerGrad)}>
          <button type="button" onClick={() => router.back()} aria-label={t("back")} className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <h1 className="text-[16px] font-900">{isDriver ? t("title_driver") : t("title_passenger")}</h1>
          <p className="text-[14px] font-700 text-white/90">{isDriver ? t("subtitle_driver") : t("subtitle_passenger")}</p>
        </div>
        <div className="flex-1 space-y-3.5 px-4 py-4">{form}</div>
        <div className="space-y-3.5 px-4 pb-4">
          {moreBlock}
          <div className="rounded-2xl bg-white p-4 shadow-card dark:bg-ink-900">
            <p className="mb-1.5 text-center text-[14px] font-700 text-ink-500 dark:text-ink-400">{isDriver ? t("note_driver") : t("note_passenger")}</p>
            {/* Consent: publishing exposes the phone to logged-in users. */}
            <p className="mb-3 text-center text-[13px] font-600 text-ink-400">{t("consent_phone")}</p>
            {createError && <p className="mb-3 rounded-xl bg-coral-50 px-4 py-2 text-[15px] font-700 text-coral-700 dark:bg-coral-500/10">{createError}</p>}
            {submitBtn}
          </div>
        </div>
      </div>

      {/* ===== DESKTOP (webCreate 2-col) ===== */}
      <div className="mx-auto hidden max-w-[1080px] gap-8 bg-ink-50 p-8 lg:grid lg:grid-cols-[330px_1fr] dark:bg-ink-950">
        <aside className="space-y-4">
          <h2 className="text-[26px] font-900 text-ink-900 dark:text-white">{isDriver ? t("web_title_driver") : t("web_title_passenger")}</h2>
          <p className="text-[15px] font-700 text-ink-600 dark:text-ink-400">{isDriver ? t("web_sub_driver") : t("web_sub_passenger")}</p>
          <div className="rounded-3xl bg-brand-50 p-4 dark:bg-brand-500/10">
            <div className="flex items-start gap-2.5 text-[14px] font-700 text-ink-700 dark:text-ink-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              {t("web_trust")}
            </div>
          </div>
        </aside>
        <div className="rounded-4xl bg-white p-7 shadow-card dark:bg-ink-900">
          <div className="space-y-3.5">
            {form}
            {moreBlock}
            {createError && <p className="rounded-xl bg-coral-50 px-4 py-2 text-[15px] font-700 text-coral-700 dark:bg-coral-500/10">{createError}</p>}
            {/* Consent: publishing exposes the phone to logged-in users. */}
            <p className="text-center text-[13px] font-600 text-ink-400">{t("consent_phone")}</p>
            {submitBtn}
          </div>
        </div>
      </div>

      {/* Published success — design-spec §3.5 */}
      <ActionModal
        open={publishedId !== null}
        onOpenChange={(o) => {
          if (!o) setPublishedId(null);
        }}
        tone="brand"
        icon={PartyPopper}
        title={t("published_title")}
        primary={
          <Button
            variant="cta"
            size="lg"
            className="w-full"
            onClick={() => {
              setPublishedId(null);
              // Land on «Мои» with the tab that holds the just-published item.
              router.push(isDriver ? "/my/bookings?tab=trips" : "/my/bookings?tab=requests");
            }}
          >
            {isDriver ? t("published_cta_driver") : t("published_cta_passenger")}
          </Button>
        }
        secondary={
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              setPublishedId(null);
              setDraft(defaults(isDriver)); // stay on Create with a clean form
            }}
          >
            {t("publish_another")}
          </Button>
        }
      >
        {isDriver ? t("published_body_driver") : t("published_body_passenger")}
      </ActionModal>
    </>
  );
}
