import { api } from "./client";
import type { components } from "./schema.gen";

export interface DriverCarPublic {
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  seats: number;
  carPhotoUrl: string | null;
  totalTrips: number;
}

// The spec omits loyaltyTier / driverCar on PublicUser; the API returns them.
export type PublicUser = components["schemas"]["PublicUser"] & {
  loyaltyTier?: string;
  driverCar?: DriverCarPublic | null;
};

export interface PublicRating {
  id: string;
  rater: { id: string; name: string; avatarUrl: string | null };
  score: number;
  tags: string[];
  comment: string | null;
  createdAt: string;
}

export async function getPublicUser(id: string): Promise<PublicUser> {
  const { data } = await api.get<PublicUser>(`/users/${id}`);
  return data;
}

export async function getUserRatings(
  id: string,
  cursor?: string,
  limit = 10,
): Promise<{ data: PublicRating[]; nextCursor: string | null }> {
  const { data } = await api.get<{ data: PublicRating[]; nextCursor: string | null }>(
    `/users/${id}/ratings`,
    { params: { cursor, limit } },
  );
  return data;
}
