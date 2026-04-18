export const USER_ROLES = ['admin', 'user'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_USER_ROLE: UserRole = 'user';

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);

export const normalizeUserRole = (value: unknown): UserRole =>
  value === 'admin' ? 'admin' : DEFAULT_USER_ROLE;

export const isAdminRole = (value: unknown): boolean => normalizeUserRole(value) === 'admin';
