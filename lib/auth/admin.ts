import type { NextRequest } from 'next/server';

import { isAdminRole } from '@/lib/auth/role';
import { getRequestSessionUser } from '@/lib/auth/request';
import { toSessionUser } from '@/lib/auth/user';
import { db } from '@/lib/db';

export const getAdminSessionUser = async (request: NextRequest) => {
  const sessionUser = await getRequestSessionUser(request);
  if (!sessionUser) {
    return null;
  }

  const currentUser = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!currentUser || !isAdminRole(currentUser.role)) {
    return null;
  }

  return toSessionUser(currentUser);
};
