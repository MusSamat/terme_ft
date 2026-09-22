import { api } from "./client";

export interface City {
  id: number;
  type?: string; // city | town | village | raion … — used to tag район/город
  nameRu: string;
  nameKg: string;
  nameEn: string;
  regionNameRu: string;
  regionNameKg: string;
  districtNameRu: string | null;
  districtNameKg: string | null;
  aiylAimakNameRu: string | null;
  aiylAimakNameKg: string | null;
  lat: number | null;
  lng: number | null;
}

export interface PopularRoute {
  from: string;
  to: string;
  tripCount: number;
  minPrice: number | null;
}

export async function getCities(limit?: number): Promise<City[]> {
  const { data } = await api.get<{ data: City[] }>("/cities", {
    params: limit ? { limit } : undefined,
  });
  return data.data;
}

// The city directory is static within a session — cache each query so
// backspacing/retyping never re-hits the network (tunnel RTT dominates).
const searchCache = new Map<string, City[]>();
const SEARCH_CACHE_MAX = 200;

export async function searchCities(q: string, limit = 10): Promise<City[]> {
  const query = q.trim();
  if (!query) return [];
  const key = `${query.toLowerCase()}|${limit}`;
  const cached = searchCache.get(key);
  if (cached) return cached;
  const { data } = await api.get<{ data: City[] }>("/cities", { params: { q: query, limit } });
  if (searchCache.size >= SEARCH_CACHE_MAX) {
    const first = searchCache.keys().next().value;
    if (first !== undefined) searchCache.delete(first);
  }
  searchCache.set(key, data.data);
  return data.data;
}

export async function getPopularRoutes(): Promise<PopularRoute[]> {
  const { data } = await api.get<{ data: PopularRoute[] }>("/cities/popular-routes");
  return data.data;
}