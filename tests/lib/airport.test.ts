import { describe, expect, it } from "vitest";
import { airportTitle, collidesWithAirport, groupByTarget, kgIso, listingTime, splitKg } from "@/lib/airport";
import { planCreateQs, planReady, planTime, EMPTY_PLAN, type AirportPlan } from "@/components/features/airport/airport-plan";
import type { Airport } from "@/lib/api/cities";

const manas = { nameRu: "Аэропорт Манас", nameKg: "Манас аэропорту", titleRu: "Манас · Бишкек", titleKg: "Манас · Бишкек" };
const osh = { nameRu: "Аэропорт Ош", nameKg: "Ош аэропорту", titleRu: "Ош", titleKg: "Ош" };

describe("pickup display (KG wall-clock)", () => {
  it("shows the suggested pickup in Kyrgyzstan time whatever the instant format", () => {
    // 21:30Z = 03:30 next day in Bishkek.
    expect(splitKg("2026-10-19T21:30:00.000Z")).toEqual({ date: "2026-10-20", time: "03:30" });
    expect(splitKg(kgIso("2026-10-20", "05:40"))).toEqual({ date: "2026-10-20", time: "05:40" });
  });

  it("an early flight moves the pickup to the previous day", () => {
    // Flight 01:00 KG − 150 min buffer − 30 min travel = 22:00 the day before.
    const pickupAt = new Date(new Date(kgIso("2026-10-21", "01:00")).getTime() - 180 * 60_000).toISOString();
    expect(splitKg(pickupAt)).toEqual({ date: "2026-10-20", time: "22:00" });
  });

  it("listing time: pickup to the airport, arrival from it", () => {
    const pickup = { date: "2026-10-20", time: "03:30" };
    expect(listingTime({ toAirport: true, flightDate: "2026-10-20", flightTime: "07:30", pickup })).toBe(
      "2026-10-20T03:30:00+06:00",
    );
    expect(listingTime({ toAirport: false, flightDate: "2026-10-20", flightTime: "05:40", pickup: null })).toBe(
      "2026-10-20T05:40:00+06:00",
    );
  });
});

describe("groupByTarget", () => {
  it("puts nearTarget items first, keeping the API order inside each group", () => {
    const rows = [
      { id: "a", nearTarget: true },
      { id: "b", nearTarget: false },
      { id: "c", nearTarget: true },
      { id: "d" },
    ];
    const { near, rest } = groupByTarget(rows);
    expect(near.map((r) => r.id)).toEqual(["a", "c"]);
    expect(rest.map((r) => r.id)).toEqual(["b", "d"]);
  });
});

describe("airport names", () => {
  it("titles per locale", () => {
    expect(airportTitle(manas, "kg")).toBe("Манас · Бишкек");
  });

  it("flags a destination named like an airport (Жалал-Абад's «Манас»)", () => {
    expect(collidesWithAirport({ nameRu: "Манас", nameKg: "Манас" }, [manas, osh], "ru")).toBe(true);
    expect(collidesWithAirport({ nameRu: "Өзгөн", nameKg: "Өзгөн" }, [manas, osh], "ru")).toBe(false);
  });
});

describe("airport plan", () => {
  const airport = {
    id: 9,
    type: "airport",
    ...manas,
    lat: 43.06,
    lng: 74.48,
    serves: null,
    flightType: "international",
    departureBufferMin: { international: 150, domestic: 90 },
    popularDestinations: [],
  } as unknown as Airport;
  const plan: AirportPlan = {
    ...EMPTY_PLAN,
    airportId: 9,
    toAirport: true,
    other: { id: 1, nameRu: "Бишкек", nameKg: "Бишкек", type: "capital" },
    flightDate: "2026-10-20",
    flightTime: "07:30",
    flightNumber: "su1882",
  };

  it("needs the pickup before it is ready to search", () => {
    expect(planReady(plan, airport)).toBe(false);
    expect(planReady({ ...plan, pickup: { date: "2026-10-20", time: "04:15" } }, airport)).toBe(true);
  });

  it("prefills the create form with the pickup and the flight", () => {
    const ready = { ...plan, pickup: { date: "2026-10-20", time: "04:15" } };
    expect(planTime(ready)).toBe("2026-10-20T04:15:00+06:00");
    const qs = new URLSearchParams(planCreateQs(ready, airport));
    expect(qs.get("from_id")).toBe("1");
    expect(qs.get("to_id")).toBe("9");
    expect(qs.get("time")).toBe("04:15");
    expect(qs.get("flight")).toBe("SU1882");
  });
});
