import { describe, expect, it } from "vitest";
import { routeItemPins } from "@/components/features/map/result-pins";
import type { MapRouteItem } from "@/lib/api/map";

const base: MapRouteItem = {
  id: "t1",
  kind: "trip",
  lat: 42.87,
  lng: 74.59,
  exact: true,
  departureAt: "2026-10-20T03:00:00.000Z",
  seatsFree: 3,
  passengers: null,
  price: 800,
  origin: { id: 1, nameRu: "Бишкек", nameKg: "Бишкек" },
  destination: { id: 2, nameRu: "Нарын", nameKg: "Нарын шаары" },
  user: { id: "u1", name: "Азамат", avatarUrl: null, rating: null, ratingCount: 0 },
};

describe("routeItemPins", () => {
  it("maps a trip with names in the UI language", () => {
    const [ru] = routeItemPins([base], "ru");
    const [kg] = routeItemPins([base], "kg");
    expect(ru).toMatchObject({ id: "t1", lat: 42.87, lng: 74.59, exact: true, seats: 3, price: 800, destinationName: "Нарын" });
    expect(kg!.destinationName).toBe("Нарын шаары");
  });

  it("uses passengers for requests and keeps settlement points approximate", () => {
    const [p] = routeItemPins(
      [{ ...base, kind: "request", exact: false, seatsFree: null, passengers: 2, price: null }],
      "ru",
    );
    expect(p).toMatchObject({ exact: false, seats: 2, price: null });
  });
});
