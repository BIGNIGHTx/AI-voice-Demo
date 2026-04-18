export const DEFAULT_AUTH_REDIRECT = '/files';
export const PUBLIC_PATHS = ['/login', '/register'] as const;
export const ADMIN_ONLY_PATHS = ['/audit-logs', '/admin'] as const;

export const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export const isAdminOnlyPath = (pathname: string): boolean =>
  ADMIN_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export const isSafeNextPath = (value: string | null | undefined): value is string =>
  Boolean(
    value &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/api') &&
    !value.startsWith('/_next')
  );

export const sanitizeNextPath = (value: string | null | undefined): string => {
  if (!isSafeNextPath(value)) return DEFAULT_AUTH_REDIRECT;
  return isPublicPath(value) ? DEFAULT_AUTH_REDIRECT : value;
};
