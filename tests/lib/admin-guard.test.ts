import { describe, it, expect } from "vitest";
import { adminGuardRedirect } from "@/lib/admin-guard";

const go = (pathname: string, o: { token?: boolean; mcp?: boolean; enrol?: boolean } = {}) =>
  adminGuardRedirect({
    pathname,
    hasToken: o.token ?? true,
    mustChangePassword: o.mcp,
    totpEnrollmentRequired: o.enrol,
  });

describe("adminGuardRedirect", () => {
  it("sends signed-out admins to login, and leaves login alone", () => {
    expect(go("/admin/users", { token: false })).toBe("/admin/login");
    expect(go("/admin/2fa", { token: false })).toBe("/admin/login");
    expect(go("/admin/login", { token: false })).toBeNull();
  });

  it("leaves a signed-in admin on panel pages and moves them off login", () => {
    expect(go("/admin/users")).toBeNull();
    expect(go("/admin/login")).toBe("/admin/dashboard");
  });

  it("forces a password change first, even when 2FA enrolment is pending", () => {
    expect(go("/admin/login", { mcp: true, enrol: true })).toBe("/admin/change-password");
    expect(go("/admin/2fa", { mcp: true, enrol: true })).toBe("/admin/change-password");
    expect(go("/admin/change-password", { mcp: true, enrol: true })).toBeNull();
  });

  it("then forces 2FA enrolment", () => {
    expect(go("/admin/login", { enrol: true })).toBe("/admin/2fa");
    expect(go("/admin/dashboard", { enrol: true })).toBe("/admin/2fa");
    expect(go("/admin/2fa", { enrol: true })).toBeNull();
    expect(go("/admin/change-password", { enrol: true })).toBeNull();
  });

  it("keeps the 2FA page reachable voluntarily", () => {
    expect(go("/admin/2fa")).toBeNull();
  });
});
