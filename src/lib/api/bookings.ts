import { api } from "./client";
import type { components } from "./schema.gen";

export type BookingStatus =
  | "pending"
  | "viewed"
  | "accepted"
  | "rejected"
  | "cancelled_by_passenger"
  | "cancelled_by_driver"
  | "cancelled_late"
  | "no_show"
  | "completed"
  | "expired";

type _BookingBase = components["schemas"]["Booking"];
export type Booking = Omit<_BookingBase, "status"> & {
  status?: BookingStatus;
  /** Price per seat frozen at booking time (schema.gen predates it). */
  pricePerSeatSnapshot?: number | null;
};

/** Booking total: snapshot price × seats; legacy rows fall back to the trip's live price. */
export function bookingTotal(
  b: { pricePerSeatSnapshot?: number | null; seatsCount?: number },
  tripPricePerSeat?: number | null,
): number | null {
  const per = b.pricePerSeatSnapshot ?? tripPricePerSeat ?? null;
  if (per == null) return null;
  return per * (b.seatsCount ?? 1);
}

export interface CreateBookingInput {
  tripId: string;
  seatsCount: number;
  comment?: string;
}

export async function createBooking(
  input: CreateBookingInput,
  idempotencyKey: string,
): Promise<Booking> {
  const { data } = await api.post<Booking>("/bookings", input, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return data;
}

export async function getBooking(id: string): Promise<Booking> {
  const { data } = await api.get<Booking>(`/bookings/${id}`);
  return data;
}

export async function listMyBookings(
  status?: BookingStatus,
  cursor?: string,
  limit = 20,
): Promise<{ data: Booking[]; nextCursor: string | null }> {
  const { data } = await api.get<{ data: Booking[]; nextCursor: string | null }>(
    "/bookings/my",
    { params: { status, cursor, limit } },
  );
  return data;
}

export async function listIncomingBookings(
  tripId?: string,
  cursor?: string,
  limit = 20,
): Promise<{ data: Booking[]; nextCursor: string | null }> {
  const { data } = await api.get<{ data: Booking[]; nextCursor: string | null }>(
    "/bookings/incoming",
    { params: { tripId, cursor, limit } },
  );
  return data;
}

export async function acceptBooking(id: string): Promise<void> {
  await api.patch(`/bookings/${id}/accept`);
}

export async function rejectBooking(id: string, reason?: string): Promise<void> {
  await api.patch(`/bookings/${id}/reject`, reason ? { reason } : {});
}

export async function cancelBooking(id: string, reasons?: string[]): Promise<void> {
  await api.patch(`/bookings/${id}/cancel`, reasons?.length ? { reasons } : {});
}

export async function markNoShow(id: string): Promise<void> {
  await api.patch(`/bookings/${id}/no-show`);
}
