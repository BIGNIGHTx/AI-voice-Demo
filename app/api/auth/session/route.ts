import { NextRequest, NextResponse } from 'next/server';

import { getRequestSessionUser } from '@/lib/auth/request';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { toPublicUser, toSessionUser } from '@/lib/auth/user';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const sessionUser = await getRequestSessionUser(request);

  if (!sessionUser) {
    const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    response.cookies.set(SESSION_COOKIE_NAME, '', { ...getSessionCookieOptions(), maxAge: 0 });
    return response;
  }

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    const response = NextResponse.json({ message: 'Session expired' }, { status: 401 });
    response.cookies.set(SESSION_COOKIE_NAME, '', { ...getSessionCookieOptions(), maxAge: 0 });
    return response;
  }

  const response = NextResponse.json({ user: toPublicUser(user) });
  const refreshedToken = await createSessionToken(toSessionUser(user));

  response.cookies.set(SESSION_COOKIE_NAME, refreshedToken, getSessionCookieOptions());

  return response;
}
