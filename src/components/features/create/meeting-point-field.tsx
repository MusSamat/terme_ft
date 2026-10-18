"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Crosshair, MapPin, Search, X } from "lucide-react";
import { getSpots, type MeetingSpot } from "@/lib/api/cities";
import type { PointInput } from "@/lib/api/trips-create";
import { placeName, type RoutePlace } from "@/lib/places";
import { getCurrentPoint } from "@/lib/hooks/use-geolocation";
import { PointPickerMap } from "@/components/map";
import { Modal, ModalContent, ModalTitle } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// Optional exact meeting point inside the chosen settlement. In a big city
// (Бишкек, Ош) this is what lets the other side pick the nearest ride — the
// pin shows on the map and the card. One tap on a known spot / жилмассив,
// «my location», or drag the pin; a short landmark note is optional.
interface Props {
  place: RoutePlace | null;
  value: PointInput | null;
  onChange: (p: PointInput | null) => void;
  label: string;
  hint: string;
  color?: string;
}

export function MeetingPointField({ place, value, onChange, label, hint, color = "#0D9488" }: Props) {
  const t = useTranslations("meeting_point");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PointInput | null>(value);
  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setQ("");
      setGeoDenied(false);
    }
  }, [open, value]);

  const capital = place?.type === "capital" && place.id !== null;
  const { data: spots = [] } = useQuery({
    queryKey: ["spots", place?.id, q.trim()],
    queryFn: () => getSpots(place!.id!, q.trim() || undefined),
    enabled: open && capital,
    staleTime: 10 * 60_000,
  });

  const center =
    place?.lat != null && place?.lng != null ? { lat: place.lat, lng: place.lng } : { lat: 42.8746, lng: 74.6122 };

  const pickSpot = (s: MeetingSpot) =>
    setDraft({ lat: s.lat, lng: s.lng, address: placeName(s, locale) });

  const locateMe = async () => {
    setLocating(true);
    const p = await getCurrentPoint();
    setLocating(false);
    if (!p) {
      setGeoDenied(true);
      return;
    }
    setDraft((d) => ({ ...p, address: d?.address }));
  };

  if (!place) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-xs ring-1 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800"
      >
        <MapPin className="h-5 w-5 shrink-0" style={{ color }} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-800 text-ink-900 dark:text-white">{label}</span>
          <span className="block truncate text-[13px] font-600 text-ink-500">
            {value ? value.address || t("pin_set") : hint}
          </span>
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={t("remove")}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onChange(null);
              }
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />
        )}
      </button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent className="flex max-h-[92vh] max-w-lg flex-col gap-3 overflow-y-auto">
          <ModalTitle className="text-[18px] font-900 text-ink-900 dark:text-white">
            {label} · {placeName(place, locale)}
          </ModalTitle>

          {capital && (
            <>
              <div className="flex items-center gap-2 rounded-2xl bg-ink-50 px-3 dark:bg-ink-800">
                <Search className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("search_area")}
                  className="h-11 w-full bg-transparent text-[15px] font-700 text-ink-900 outline-none placeholder:text-ink-400 dark:text-white"
                />
              </div>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {spots.slice(0, 30).map((s) => (
                  <button
                    key={`${s.kind}-${s.nameRu}`}
                    type="button"
                    onClick={() => pickSpot(s)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-800 ring-1 transition-colors",
                      draft?.address === placeName(s, locale)
                        ? "bg-brand-600 text-white ring-brand-600"
                        : s.kind === "spot"
                          ? "bg-accent-50 text-accent-800 ring-accent-200 dark:bg-accent-500/10 dark:text-accent-200 dark:ring-accent-500/30"
                          : "bg-white text-ink-700 ring-ink-200 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-700",
                    )}
                  >
                    {placeName(s, locale)}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="relative">
            <PointPickerMap value={draft} center={center} onChange={(p) => setDraft((d) => ({ ...p, address: d?.address }))} color={color} />
            <button
              type="button"
              onClick={() => void locateMe()}
              disabled={locating}
              className="absolute bottom-3 right-3 z-[500] flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[13px] font-800 text-ink-800 shadow-lift disabled:opacity-60 dark:bg-ink-900 dark:text-ink-100"
            >
              <Crosshair className="h-4 w-4 text-brand-600" aria-hidden="true" />
              {locating ? t("locating") : t("my_location")}
            </button>
          </div>
          <p className="text-[12.5px] font-600 text-ink-500">{geoDenied ? t("geo_denied") : t("tap_hint")}</p>

          <input
            value={draft?.address ?? ""}
            onChange={(e) => draft && setDraft({ ...draft, address: e.target.value.slice(0, 200) })}
            disabled={!draft}
            placeholder={t("address_placeholder")}
            className="h-11 w-full rounded-2xl border border-ink-200 bg-white px-3.5 text-[15px] font-700 text-ink-900 outline-none focus:border-brand-500 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />

          <div className="flex gap-2">
            {value && (
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                {t("remove")}
              </Button>
            )}
            <Button
              variant="brand"
              size="lg"
              className="flex-1"
              disabled={!draft}
              onClick={() => {
                onChange(draft ? { ...draft, address: draft.address?.trim() || undefined } : null);
                setOpen(false);
              }}
            >
              {t("done")}
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}
