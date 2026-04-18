import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionUser } from '@/lib/auth/admin';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const sessionUser = await getAdminSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const rawLimit = Number(request.nextUrl.searchParams.get('limit') ?? 150);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 300) : 150;
  const action = request.nextUrl.searchParams.get('action')?.trim().toUpperCase();

  const logs = await db.auditLog.findMany({
    where: action ? { action } : undefined,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ logs });
}

export async function DELETE(request: NextRequest) {
  const sessionUser = await getAdminSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const result = await db.auditLog.deleteMany();

  return NextResponse.json({ deletedCount: result.count });
}
