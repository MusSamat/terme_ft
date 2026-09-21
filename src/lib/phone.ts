// Phone handling — E.164 with a Kyrgyz (+996) default.
// Rule: +996 numbers are exactly 9 national digits; any other country code
// follows general E.164 (7–15 total digits). Keep this the single source of
// truth so the input, validators and the backend schema stay in lock-step.

export const DEFAULT_DIAL = "+996";

/** Normalize free text to `+<digits>`. +996 caps the national part at 9 digits. */
export function sanitizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const capped = digits.startsWith("996") ? digits.slice(0, 12) : digits.slice(0, 15);
  return `+${capped}`;
}

/** Valid when +996 has exactly 9 national digits, or general E.164 otherwise. */
export function isValidPhone(v: string): boolean {
  return /^(?:\+996\d{9}|\+(?!996)[1-9]\d{6,14})$/.test(v);
}

/** Light readability grouping for display: "+996 700 123 456". */
export function formatPhoneDisplay(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (!digits) return v || "";
  const groups = digits.match(/.{1,3}/g) ?? [];
  return `+${groups.join(" ")}`;
}
