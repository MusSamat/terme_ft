import { describe, it, expect } from "vitest";
import { findCity, KG_CITIES, type CityCoord } from "@/lib/kg-cities";

describe("KG_CITIES", () => {
  it("is non-empty", () => {
    expect(KG_CITIES.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const city of KG_CITIES) {
      expect(city.nameRu).toBeTruthy();
      expect(city.nameKg).toBeTruthy();
      expect(typeof city.lat).toBe("number");
      expect(typeof city.lng).toBe("number");
    }
  });

  it("coordinates are within Kyrgyzstan bounding box", () => {
    for (const city of KG_CITIES) {
      expect(city.lat).toBeGreaterThan(39);
      expect(city.lat).toBeLessThan(43.5);
      expect(city.lng).toBeGreaterThan(69);
      expect(city.lng).toBeLessThan(80);
    }
  });
});

describe("findCity", () => {
  it("finds a city by exact Russian name", () => {
    const city = findCity("Бишкек");
    expect(city).not.toBeNull();
    expect(city!.nameRu).toBe("Бишкек");
  });

  it("finds a city by exact Kyrgyz name", () => {
    const city = findCity("Ош");
    expect(city).not.toBeNull();
    expect(city!.nameKg).toBe("Ош");
  });

  it("is case-insensitive", () => {
    expect(findCity("бишкек")).not.toBeNull();
    expect(findCity("БИШКЕК")).not.toBeNull();
  });

  it("trims whitespace before matching", () => {
    expect(findCity("  Бишкек  ")).not.toBeNull();
  });

  it("returns null for an unknown city name", () => {
    expect(findCity("Москва")).toBeNull();
    expect(findCity("unknown")).toBeNull();
  });

  it("returns null when name is null", () => {
    expect(findCity(null)).toBeNull();
  });

  it("returns null when name is undefined", () => {
    expect(findCity(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(findCity("")).toBeNull();
  });

  it("finds Жалал-Абад by name", () => {
    const city = findCity("Жалал-Абад");
    expect(city).not.toBeNull();
    expect(city!.nameRu).toBe("Жалал-Абад");
  });

  it("includes Манас", () => {
    expect(findCity("Манас")).not.toBeNull();
  });
});
