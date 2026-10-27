// Centralized contract for application-level roles.
// The app is intentionally restricted to two roles:
//   - 'user'   -> default authenticated end-user
//   - 'admin'  -> back-office operator
//
// Anything else (NULL, '', legacy 'anonymous', typos, etc.) is coerced to
// 'user'. Both the React layer (AuthContext / ProtectedRoute) and the
// database trigger in `profiles_role_user_admin_only` rely on this contract.

export const ALLOWED_APP_ROLES = Object.freeze(['user', 'admin', 'recruiting']);

export function isAllowedAppRole(role) {
  return ALLOWED_APP_ROLES.includes(role);
}

export function normalizeAppRole(role) {
  return isAllowedAppRole(role) ? role : 'user';
}

export function isAdminRole(role) {
  return role === 'admin';
}
