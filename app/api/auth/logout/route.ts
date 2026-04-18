import { NextRequest, NextResponse } from 'next/server';

import { createAuditLog } from '@/lib/audit-log';
import { getRequestSessionUser } from '@/lib/auth/request';
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const sessionUser = await getRequestSessionUser(request);

  if (sessionUser) {
    await createAuditLog({
      userId: sessionUser.id,
      action: 'LOGOUT',
      headers: request.headers,
      target: sessionUser.email,
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', { ...getSessionCookieOptions(), maxAge: 0 });

  return response;
}
