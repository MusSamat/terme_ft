import { api } from "./client";
import type { components } from "./schema.gen";
import { uuid } from "@/lib/utils/uuid";

type TripDetail = components["schemas"]["TripDetail"];

export type LuggageOption = "yes" | "small" | "no";

export interface PointInput {
  lat: number;
  lng: number;
  address?: string;
}

export interface CreateTripInput {
  originCityId: number;
  destinationCityId: number;
  /** Exact boarding / drop-off spots (map pins) — optional. */
  originPoint?: PointInput;
  destinationPoint?: PointInput;
  /** Which of the user's cars rides this trip; omitted → newest car. */
  carId?: string;
  pickupCityIds?: number[];
  dropoffCityIds?: number[];
  departureAt: string;
  /** «Выезжаем 06:00–11:00» — optional window end, ISO datetime after departureAt. */
  departureWindowEnd?: string;
  departureFlexible?: boolean;
  seatsTotal: number;
  pricePerSeat: number;
  priceNegotiable?: boolean;
  luggage?: LuggageOption;
  preferences?: Record<string, boolean>;
  comment?: string;
}

export async function createTrip(input: CreateTripInput, idempotencyKey?: string): Promise<TripDetail> {
  // Caller passes a STABLE key so a retry after a lost response replays the
  // original trip instead of creating a duplicate; falls back to a fresh uuid.
  const { data } = await api.post<TripDetail>("/trips", input, {
    headers: { "Idempotency-Key": idempotencyKey ?? uuid() },
  });
  return data;
}
