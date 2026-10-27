import {
  ALLOWED_APP_ROLES,
  isAdminRole,
  isAllowedAppRole,
  normalizeAppRole,
} from '@/lib/role';

describe('role contract (user | admin only)', () => {
  test('ALLOWED_APP_ROLES is frozen and contains exactly user + admin', () => {
    expect(ALLOWED_APP_ROLES).toEqual(['user', 'admin', 'recruiting']);
    expect(Object.isFrozen(ALLOWED_APP_ROLES)).toBe(true);
  });

  test.each(['user', 'admin'])('isAllowedAppRole accepts %s', (role) => {
    expect(isAllowedAppRole(role)).toBe(true);
  });

  test.each([
    null,
    undefined,
    '',
    'anonymous',
    'guest',
    'super-admin',
    'USER',
    'Admin',
    0,
    false,
  ])('isAllowedAppRole rejects %p', (role) => {
    expect(isAllowedAppRole(role)).toBe(false);
  });

  test('normalizeAppRole keeps valid roles untouched', () => {
    expect(normalizeAppRole('user')).toBe('user');
    expect(normalizeAppRole('admin')).toBe('admin');
  });

  test('normalizeAppRole coerces legacy / unknown roles to user', () => {
    expect(normalizeAppRole(null)).toBe('user');
    expect(normalizeAppRole(undefined)).toBe('user');
    expect(normalizeAppRole('anonymous')).toBe('user');
    expect(normalizeAppRole('guest')).toBe('user');
    expect(normalizeAppRole('Admin')).toBe('user');
    expect(normalizeAppRole('')).toBe('user');
  });

  test('isAdminRole only accepts the exact admin string', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('user')).toBe(false);
    expect(isAdminRole('Admin')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});
