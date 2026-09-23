import { describe, it, expect } from "vitest";
import {
  phoneSchema,
  otpSchema,
  passwordSchema,
  nameSchema,
  loginSchema,
  profileSchema,
} from "@/lib/validation/auth";

// ─── phoneSchema ─────────────────────────────────────────────────────────────

describe("phoneSchema", () => {
  it("accepts a valid Kyrgyz number", () => {
    expect(phoneSchema.safeParse("+996700123456").success).toBe(true);
  });

  it("accepts numbers with different operator prefixes", () => {
    expect(phoneSchema.safeParse("+996550123456").success).toBe(true);
    expect(phoneSchema.safeParse("+996770123456").success).toBe(true);
    expect(phoneSchema.safeParse("+996312123456").success).toBe(true);
  });

  it("rejects missing + prefix", () => {
    expect(phoneSchema.safeParse("996700123456").success).toBe(false);
  });

  it("accepts other country codes as general E.164", () => {
    // Backend KgPhoneSchema allows any E.164 number; only +996 is length-pinned.
    expect(phoneSchema.safeParse("+7700123456").success).toBe(true);
    expect(phoneSchema.safeParse("+995700123456").success).toBe(true);
  });

  it("rejects a bare country code with too few digits", () => {
    expect(phoneSchema.safeParse("+7").success).toBe(false);
  });

  it("rejects +996 with too few national digits", () => {
    expect(phoneSchema.safeParse("+99670012345").success).toBe(false);  // 8 digits
  });

  it("rejects +996 with too many national digits", () => {
    expect(phoneSchema.safeParse("+9967001234567").success).toBe(false); // 10 digits
  });

  it("rejects letters in the number", () => {
    expect(phoneSchema.safeParse("+996700ABCDEF").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(phoneSchema.safeParse("").success).toBe(false);
  });
});

// ─── otpSchema ───────────────────────────────────────────────────────────────

describe("otpSchema", () => {
  it("accepts exactly 6 digits", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
    expect(otpSchema.safeParse("000000").success).toBe(true);
    expect(otpSchema.safeParse("999999").success).toBe(true);
  });

  it("rejects 5 digits", () => {
    expect(otpSchema.safeParse("12345").success).toBe(false);
  });

  it("rejects 7 digits", () => {
    expect(otpSchema.safeParse("1234567").success).toBe(false);
  });

  it("rejects letters mixed with digits", () => {
    expect(otpSchema.safeParse("12345a").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(otpSchema.safeParse("").success).toBe(false);
  });

  it("rejects string with spaces", () => {
    expect(otpSchema.safeParse("123 45").success).toBe(false);
  });
});

// ─── passwordSchema ───────────────────────────────────────────────────────────

describe("passwordSchema", () => {
  it("accepts a valid password with letters and digits", () => {
    expect(passwordSchema.safeParse("Password1").success).toBe(true);
    expect(passwordSchema.safeParse("abcdefg1").success).toBe(true);
    expect(passwordSchema.safeParse("12345678").success).toBe(true); // all digits is fine
  });

  it("rejects password shorter than 8 characters", () => {
    expect(passwordSchema.safeParse("Pass1").success).toBe(false);
    expect(passwordSchema.safeParse("1234567").success).toBe(false); // 7 chars
  });

  it("rejects exactly 7 characters", () => {
    expect(passwordSchema.safeParse("Passw0r").success).toBe(false);
  });

  it("accepts exactly 8 characters", () => {
    expect(passwordSchema.safeParse("Passw0rd").success).toBe(true);
  });

  it("rejects password with no digits", () => {
    expect(passwordSchema.safeParse("PasswordNoDigits").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(passwordSchema.safeParse("").success).toBe(false);
  });
});

// ─── nameSchema ───────────────────────────────────────────────────────────────

describe("nameSchema", () => {
  it("accepts a typical name", () => {
    expect(nameSchema.safeParse("Иван").success).toBe(true);
    expect(nameSchema.safeParse("Айгерим Токтосунова").success).toBe(true);
  });

  it("accepts exactly 2 characters", () => {
    expect(nameSchema.safeParse("АН").success).toBe(true);
  });

  it("rejects a single character", () => {
    expect(nameSchema.safeParse("А").success).toBe(false);
  });

  it("accepts exactly 50 characters", () => {
    expect(nameSchema.safeParse("А".repeat(50)).success).toBe(true);
  });

  it("rejects 51 characters", () => {
    expect(nameSchema.safeParse("А".repeat(51)).success).toBe(false);
  });

  it("trims whitespace before validation (2 real chars after trim)", () => {
    expect(nameSchema.safeParse("  АН  ").success).toBe(true);
  });

  it("rejects a whitespace-only string (empty after trim)", () => {
    expect(nameSchema.safeParse("  ").success).toBe(false);
  });
});

// ─── loginSchema ──────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid phone + non-empty password", () => {
    expect(loginSchema.safeParse({ phone: "+996700123456", password: "any" }).success).toBe(true);
  });

  it("rejects invalid phone", () => {
    expect(loginSchema.safeParse({ phone: "0700123456", password: "any" }).success).toBe(false);
  });

  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ phone: "+996700123456", password: "" }).success).toBe(false);
  });
});

// ─── profileSchema ────────────────────────────────────────────────────────────

describe("profileSchema", () => {
  it("accepts valid name and language", () => {
    expect(profileSchema.safeParse({ name: "Айгерим", language: "ru" }).success).toBe(true);
    expect(profileSchema.safeParse({ name: "Айгерим", language: "kg" }).success).toBe(true);
  });

  it("rejects invalid language", () => {
    expect(profileSchema.safeParse({ name: "Айгерим", language: "en" }).success).toBe(false);
    expect(profileSchema.safeParse({ name: "Айгерим", language: "ky" }).success).toBe(false);
  });

  it("rejects short name", () => {
    expect(profileSchema.safeParse({ name: "А", language: "ru" }).success).toBe(false);
  });
});
