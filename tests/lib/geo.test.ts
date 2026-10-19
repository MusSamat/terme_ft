import { describe, expect, it } from "vitest";
import { clusterPins, CLUSTER_MAX_ZOOM, formatDistance, haversineKm, inKg, routeFitPoints, sortByDistance } from "@/lib/geo";

const BISHKEK = { lat: 42.8746, lng: 74.5698 };
const OSH = { lat: 40.5283, lng: 72.7985 };

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

describe("inKg", () => {
  it("knows Kyrgyzstan bounds", () => {
    expect(inKg(BISHKEK)).toBe(true);
    expect(inKg({ lat: 43.24, lng: 76.89 })).toBe(true); // Almaty is inside the bbox, as on the API
    expect(inKg({ lat: 55.75, lng: 37.62 })).toBe(false);
  });
});

describe("clusterPins", () => {
  const pins = [
    { id: "a", lat: 42.8746, lng: 74.5698 },
    { id: "b", lat: 42.8746, lng: 74.5698 }, // same spot (no pin → settlement centre)
    { id: "c", lat: 42.876, lng: 74.6 }, // ~2.5 km east
    { id: "osh", ...OSH },
  ];

  it("groups nearby pins at a low zoom", () => {
    const { singles, clusters } = clusterPins(pins, 9);
    expect(singles.map((s) => s.id)).toEqual(["osh"]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.count).toBe(3);
    expect(clusters[0]!.ids.sort()).toEqual(["a", "b", "c"]);
  });

  it("from CLUSTER_MAX_ZOOM only identical points merge", () => {
    const { singles, clusters } = clusterPins(pins, CLUSTER_MAX_ZOOM);
    expect(singles.map((s) => s.id).sort()).toEqual(["c", "osh"]);
    expect(clusters).toEqual([{ lat: 42.8746, lng: 74.5698, count: 2, ids: ["a", "b"] }]);
  });

  it("no pins → nothing", () => {
    expect(clusterPins([], 12)).toEqual({ singles: [], clusters: [] });
  });
});

describe("routeFitPoints", () => {
  const pickups = [{ lat: 42.88, lng: 74.6 }, { lat: 42.86, lng: 74.55 }];

  it("frames every pickup plus the user near the origin", () => {
    const me = { lat: 42.9, lng: 74.7 };
    expect(routeFitPoints(pickups, BISHKEK, me)).toEqual([...pickups, me]);
  });

  it("leaves out a user far from the origin", () => {
    expect(routeFitPoints(pickups, BISHKEK, OSH)).toEqual(pickups);
  });

  it("falls back to the origin when there are no pickups", () => {
    expect(routeFitPoints([], BISHKEK, null)).toEqual([BISHKEK]);
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
