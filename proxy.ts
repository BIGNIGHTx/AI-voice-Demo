import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isAdminRole } from '@/lib/auth/role';
import { DEFAULT_AUTH_REDIRECT, isAdminOnlyPath, isPublicPath } from '@/lib/auth/routes';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session';

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = await verifySessionToken(token);

  if (isPublicPath(pathname)) {
    if (sessionUser) {
      return NextResponse.redirect(new URL(DEFAULT_AUTH_REDIRECT, request.url));
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!sessionUser) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}` || DEFAULT_AUTH_REDIRECT);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminOnlyPath(pathname) && !isAdminRole(sessionUser.role)) {
    return NextResponse.redirect(new URL(DEFAULT_AUTH_REDIRECT, request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
