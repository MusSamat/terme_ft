import { describe, it, expect } from "vitest";
import { ROLE_COLORS, ROLE_THEME, type UiRole } from "@/lib/role-colors";

describe("ROLE_THEME", () => {
  it("covers all three UI roles", () => {
    expect(Object.keys(ROLE_THEME).sort()).toEqual(["driver", "guest", "passenger"]);
  });

  it("guest accents are ink (warm gray)", () => {
    expect(ROLE_THEME.guest.textOn).toContain("text-ink-");
    expect(ROLE_THEME.guest.tabUnderline).toBe("bg-ink-500");
  });

  // Two-brand palette: passenger and driver share one teal recipe; the
  // primary CTA is amber; roles differ by icon + label only.
  it("passenger accents are brand (teal) with an amber CTA", () => {
    expect(ROLE_THEME.passenger.textOn).toContain("text-brand-");
    expect(ROLE_THEME.passenger.ctaFilled).toContain("bg-accent-500");
    expect(ROLE_THEME.passenger.tabUnderline).toBe("bg-brand-600");
  });

  it("driver uses the same colour recipe as passenger", () => {
    const { labelKey: _pl, icon: _pi, ...passenger } = ROLE_THEME.passenger;
    const { labelKey: _dl, icon: _di, ...driver } = ROLE_THEME.driver;
    expect(driver).toEqual(passenger);
  });

  it("labelKey and icon match the role", () => {
    expect(ROLE_THEME.guest.labelKey).toBe("guest");
    expect(ROLE_THEME.guest.icon).toBe("eye");
    expect(ROLE_THEME.passenger.labelKey).toBe("passenger");
    expect(ROLE_THEME.passenger.icon).toBe("user");
    expect(ROLE_THEME.driver.labelKey).toBe("driver");
    expect(ROLE_THEME.driver.icon).toBe("car-front");
  });

  it("all roles expose the same theme property names", () => {
    const roles = Object.keys(ROLE_THEME) as UiRole[];
    const reference = Object.keys(ROLE_THEME.guest).sort();
    for (const role of roles) {
      expect(Object.keys(ROLE_THEME[role]).sort()).toEqual(reference);
    }
  });

  it("guest is neutral, distinct from the signed-in teal recipe", () => {
    expect(ROLE_THEME.guest.badge).not.toBe(ROLE_THEME.passenger.badge);
  });
});

describe("ROLE_COLORS (deprecated pre-redesign map)", () => {
  it("passenger has navActive: text-brand-600", () => {
    expect(ROLE_COLORS.passenger.navActive).toBe("text-brand-600");
  });

  it("driver has the same teal navActive as passenger", () => {
    expect(ROLE_COLORS.driver.navActive).toBe("text-brand-600");
  });

  it("all ROLE_COLORS keys have the same property names", () => {
    const expectedProps = [
      "navActive",
      "navActivePill",
      "avatarRingOn",
      "avatarRingOff",
      "avatarBgOn",
      "avatarBgOff",
      "profileRing",
    ];
    for (const role of Object.keys(ROLE_COLORS) as Array<keyof typeof ROLE_COLORS>) {
      expect(Object.keys(ROLE_COLORS[role])).toEqual(expectedProps);
    }
  });
});
