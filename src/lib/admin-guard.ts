// Where the admin panel must send the current admin, or null to stay put.
// Order: sign in → replace a temporary password → enrol 2FA (when the backend
// requires it) → panel. The change-password and 2FA pages stay reachable
// voluntarily, so being there is never redirected away from by itself.
export const ADMIN_LOGIN = "/admin/login";
export const ADMIN_CHANGE_PASSWORD = "/admin/change-password";
export const ADMIN_2FA = "/admin/2fa";
export const ADMIN_HOME = "/admin/dashboard";

export function adminGuardRedirect(input: {
  pathname: string;
  hasToken: boolean;
  mustChangePassword?: boolean;
  totpEnrollmentRequired?: boolean;
}): string | null {
  const { pathname, hasToken, mustChangePassword, totpEnrollmentRequired } = input;
  const onLogin = pathname === ADMIN_LOGIN;
  if (!hasToken) return onLogin ? null : ADMIN_LOGIN;
  if (mustChangePassword) return pathname === ADMIN_CHANGE_PASSWORD ? null : ADMIN_CHANGE_PASSWORD;
  if (totpEnrollmentRequired) {
    return pathname === ADMIN_2FA || pathname === ADMIN_CHANGE_PASSWORD ? null : ADMIN_2FA;
  }
  return onLogin ? ADMIN_HOME : null;
}
