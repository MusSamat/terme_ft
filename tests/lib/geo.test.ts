import { describe, expect, it, vi } from "vitest";
import { bboxAround, findNearest, formatDistance, haversineKm, inKg, KG_BBOX, sortByDistance, type BBox } from "@/lib/geo";

const BISHKEK = { lat: 42.8746, lng: 74.5698 };
const OSH = { lat: 40.5283, lng: 72.7985 };

const inBox = (b: BBox) => (p: { lat: number; lng: number }) =>
  p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east;

describe("haversineKm", () => {
  it("Бишкек → Ош ≈ 300 km great-circle", () => {
    expect(haversineKm(BISHKEK, OSH)).toBeGreaterThan(290);
    expect(haversineKm(BISHKEK, OSH)).toBeLessThan(310);
  });
  it("is zero for the same point", () => {
    expect(haversineKm(BISHKEK, BISHKEK)).toBe(0);
  });
});

describe("sortByDistance", () => {
  it("orders nearest first and annotates distance", () => {
    const far = { id: "osh", ...OSH };
    const near = { id: "near", lat: 42.88, lng: 74.58 };
    const mid = { id: "kant", lat: 42.89, lng: 74.85 };
    const out = sortByDistance([far, mid, near], BISHKEK);
    expect(out.map((x) => x.id)).toEqual(["near", "kant", "osh"]);
    expect(out[0]!.distanceKm).toBeLessThan(2);
  });
  it("keeps input order for equal distances", () => {
    const a = { id: "a", lat: 42, lng: 74 };
    const b = { id: "b", lat: 42, lng: 74 };
    expect(sortByDistance([a, b], BISHKEK).map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("bboxAround / inKg", () => {
  it("box encloses the circle", () => {
    const b = bboxAround(BISHKEK, 10);
    expect(haversineKm(BISHKEK, { lat: b.north, lng: BISHKEK.lng })).toBeCloseTo(10, 0);
    expect(haversineKm(BISHKEK, { lat: BISHKEK.lat, lng: b.east })).toBeCloseTo(10, 0);
  });
  it("knows Kyrgyzstan bounds", () => {
    expect(inKg(BISHKEK)).toBe(true);
    expect(inKg({ lat: 43.24, lng: 76.89 })).toBe(true); // Almaty is inside the bbox, as on the API
    expect(inKg({ lat: 55.75, lng: 37.62 })).toBe(false);
  });
});

describe("findNearest (radius expansion 10 → 30 → 100 km → country)", () => {
  const listings = [
    { id: "kant", lat: 42.891, lng: 74.851 }, // ~23 km
    { id: "tokmok", lat: 42.842, lng: 75.301 }, // ~60 km
    { id: "osh", ...OSH },
  ];
  const fetcher = (data: typeof listings) =>
    vi.fn(async (box: BBox) => data.filter(inBox(box)));

  it("stops at the first radius with results", async () => {
    const near = [{ id: "near", lat: 42.88, lng: 74.58 }, ...listings];
    const f = fetcher(near);
    const r = await findNearest(BISHKEK, f);
    expect(r.radiusKm).toBe(10);
    expect(r.expanded).toBe(false);
    expect(r.items.map((i) => i.id)).toEqual(["near"]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("widens to 30 km and drops box corners outside the circle", async () => {
    const f = fetcher(listings);
    const r = await findNearest(BISHKEK, f);
    expect(r.radiusKm).toBe(30);
    expect(r.expanded).toBe(true);
    expect(r.items.map((i) => i.id)).toEqual(["kant"]);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("widens to 100 km", async () => {
    const r = await findNearest(BISHKEK, fetcher(listings.slice(1)));
    expect(r.radiusKm).toBe(100);
    expect(r.items.map((i) => i.id)).toEqual(["tokmok"]);
  });

  it("falls back to the whole country, nearest first", async () => {
    const f = fetcher([{ id: "osh", ...OSH }, { id: "batken", lat: 40.06, lng: 70.82 }]);
    const r = await findNearest(BISHKEK, f);
    expect(r.radiusKm).toBeNull();
    expect(r.expanded).toBe(true);
    expect(r.items.map((i) => i.id)).toEqual(["osh", "batken"]);
    expect(f).toHaveBeenLastCalledWith(KG_BBOX);
    expect(f).toHaveBeenCalledTimes(4);
  });

  it("empty country → no items, not expanded", async () => {
    const r = await findNearest(BISHKEK, fetcher([]));
    expect(r).toEqual({ items: [], radiusKm: null, expanded: false });
  });
});

describe("formatDistance", () => {
  const u = { km: "км", m: "м" };
  it("metres under 1 km, one decimal under 10 km, whole km above", () => {
    expect(formatDistance(0.347, u)).toBe("350 м");
    expect(formatDistance(1.24, u)).toBe("1,2 км");
    expect(formatDistance(34.6, u)).toBe("35 км");
  });
});
