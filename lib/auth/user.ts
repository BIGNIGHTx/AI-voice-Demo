import { normalizeUserRole, type UserRole } from '@/lib/auth/role';
import type { SessionUser } from '@/lib/auth/session';

interface AuthUserShape {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

interface SessionUserShape {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface SerializedPublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string | null;
}

export const toSessionUser = (user: SessionUserShape): SessionUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: normalizeUserRole(user.role),
});

export const toPublicUser = (user: AuthUserShape): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: normalizeUserRole(user.role),
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
});
