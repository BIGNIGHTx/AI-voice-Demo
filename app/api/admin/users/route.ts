import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionUser } from '@/lib/auth/admin';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const sessionUser = await getAdminSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          auditLogs: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  type UserRow = (typeof users)[number];

  const firstAdmin = users
    .filter((user: UserRow) => user.role === 'admin')
    .sort((left: UserRow, right: UserRow) => left.createdAt.getTime() - right.createdAt.getTime())[0] ?? null;

  return NextResponse.json({
    currentUserId: sessionUser.id,
    firstAdminId: firstAdmin?.id ?? null,
    users,
  });
}
