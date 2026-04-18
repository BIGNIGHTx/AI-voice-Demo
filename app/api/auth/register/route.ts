import { NextResponse } from 'next/server';

import { createAuditLog } from '@/lib/audit-log';
import { hashPassword } from '@/lib/auth/password';
import { DEFAULT_USER_ROLE } from '@/lib/auth/role';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { toPublicUser, toSessionUser } from '@/lib/auth/user';
import { parseRegisterInput } from '@/lib/auth/validators';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = parseRegisterInput(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: DEFAULT_USER_ROLE,
      lastLoginAt: new Date(),
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'USER_REGISTERED',
    headers: request.headers,
    target: user.email,
  });

  await createAuditLog({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    headers: request.headers,
    target: user.email,
    metadata: { source: 'register' },
  });

  const token = await createSessionToken(toSessionUser(user));
  const response = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });

  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

  return response;
}
