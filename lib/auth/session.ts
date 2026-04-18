import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

import { normalizeUserRole, type UserRole } from '@/lib/auth/role';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface SessionPayload extends JWTPayload {
  user: SessionUser;
}

export const SESSION_COOKIE_NAME = 'aivoice_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const getAuthSecret = () => new TextEncoder().encode(
  process.env.AUTH_SECRET || 'local-dev-auth-secret-change-me'
);

const parseSessionUser = (value: unknown): SessionUser | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const email = typeof candidate.email === 'string' ? candidate.email.trim() : '';

  if (!id || !name || !email) {
    return null;
  }

  return {
    id,
    name,
    email,
    role: normalizeUserRole(candidate.role),
  };
};

export const createSessionToken = async (user: SessionUser): Promise<string> => (
  new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE)
    .sign(getAuthSecret())
);

export const verifySessionToken = async (token: string | null | undefined): Promise<SessionUser | null> => {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return parseSessionUser((payload as SessionPayload).user);
  } catch {
    return null;
  }
};

export const getSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE,
});
