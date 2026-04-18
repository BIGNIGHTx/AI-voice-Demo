import { NextResponse } from 'next/server';

import { createAuditLog } from '@/lib/audit-log';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { toPublicUser, toSessionUser } from '@/lib/auth/user';
import { parseLoginInput } from '@/lib/auth/validators';
import { db } from '@/lib/db';

const INVALID_CREDENTIALS_MESSAGE = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = parseLoginInput(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    await createAuditLog({
      action: 'LOGIN_FAILED',
      headers: request.headers,
      target: email,
      metadata: { reason: 'USER_NOT_FOUND' },
    });

    return NextResponse.json({ message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_FAILED',
      headers: request.headers,
      target: user.email,
      metadata: { reason: 'INVALID_PASSWORD' },
    });

    return NextResponse.json({ message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
  }

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createAuditLog({
    userId: updatedUser.id,
    action: 'LOGIN_SUCCESS',
    headers: request.headers,
    target: updatedUser.email,
  });

  const token = await createSessionToken(toSessionUser(updatedUser));
  const response = NextResponse.json({ user: toPublicUser(updatedUser) });

  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

  return response;
}
