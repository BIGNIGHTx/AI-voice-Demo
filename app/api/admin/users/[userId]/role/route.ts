import { NextRequest, NextResponse } from 'next/server';

import { createAuditLog } from '@/lib/audit-log';
import { getAdminSessionUser } from '@/lib/auth/admin';
import { isUserRole } from '@/lib/auth/role';
import { db } from '@/lib/db';

const parseRole = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';

  const role = (payload as Record<string, unknown>).role;
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
};

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionUser = await getAdminSessionUser(request);

  if (!sessionUser) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await context.params;

  if (!userId) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  if (sessionUser.id === userId) {
    return NextResponse.json({ message: 'ไม่สามารถเปลี่ยนสิทธิ์ของบัญชีตัวเองจากหน้านี้ได้' }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const nextRole = parseRole(payload);

  if (!isUserRole(nextRole)) {
    return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
  }

  const firstAdmin = await db.user.findFirst({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
    },
  });

  if (firstAdmin && firstAdmin.id === userId && sessionUser.id !== firstAdmin.id) {
    return NextResponse.json({ message: 'Admin คนแรกถูกล็อกไว้ ไม่สามารถเปลี่ยนสิทธิ์จากบัญชี admin อื่นได้' }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
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
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  if (user.role === nextRole) {
    return NextResponse.json({ user });
  }

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: { role: nextRole },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  await createAuditLog({
    userId: sessionUser.id,
    action: 'USER_ROLE_UPDATED',
    headers: request.headers,
    target: updatedUser.email,
    routePath: '/admin/users',
    metadata: {
      targetUserId: updatedUser.id,
      previousRole: user.role,
      nextRole,
      updatedBy: sessionUser.email,
      source: 'admin-user-management',
    },
  });

  return NextResponse.json({ user: updatedUser });
}
