export interface CityCoord {
  nameRu: string;
  nameKg: string;
  lat: number;
  lng: number;
}

export const KG_CITIES: CityCoord[] = [
  { nameRu: "Бишкек", nameKg: "Бишкек", lat: 42.8746, lng: 74.5698 },
  { nameRu: "Ош", nameKg: "Ош", lat: 40.5283, lng: 72.7985 },
  { nameRu: "Каракол", nameKg: "Каракол", lat: 42.4905, lng: 78.3926 },
  { nameRu: "Нарын", nameKg: "Нарын", lat: 41.4287, lng: 75.9911 },
  { nameRu: "Талас", nameKg: "Талас", lat: 42.5185, lng: 72.2428 },
  { nameRu: "Чолпон-Ата", nameKg: "Чолпон-Ата", lat: 42.6497, lng: 77.0811 },
  { nameRu: "Жалал-Абад", nameKg: "Жалал-Абад", lat: 40.9333, lng: 72.9861 },
  { nameRu: "Манас", nameKg: "Манас", lat: 41.2333, lng: 72.9333 },
  { nameRu: "Иссык-Куль", nameKg: "Ысык-Көл", lat: 42.45, lng: 77.75 },
];

export function findCity(name?: string | null): CityCoord | null {
  if (!name) return null;
  const lower = name.trim().toLowerCase();
  return (
    KG_CITIES.find(
      (c) => c.nameRu.toLowerCase() === lower || c.nameKg.toLowerCase() === lower,
    ) ?? null
  );
}
