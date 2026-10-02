// Single source of truth for "when were the legal docs last changed in a way
// that requires users to re-consent". Bump this date whenever Terms or Privacy
// are updated — every user who accepted BEFORE it will be asked to accept again.
// Keep it in sync with the "Версия … · от <дата>" line shown on /terms & /privacy.
export const POLICY_LAST_UPDATED = new Date("2026-07-04T00:00:00Z");

/**
 * Whether the consent gate should be shown. True when the user has never
 * accepted, or accepted an older revision than the current policy.
 */
export function needsTermsConsent(termsAcceptedAt: string | null | undefined): boolean {
  if (!termsAcceptedAt) return true;
  return new Date(termsAcceptedAt) < POLICY_LAST_UPDATED;
}
