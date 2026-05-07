import type { SerializedPublicUser } from '@/lib/auth/user';

let cachedSessionUser: SerializedPublicUser | null = null;
let hasResolvedSessionUser = false;
let cachedAt = 0;

const SESSION_USER_CACHE_TTL_MS = 60_000;

export const getCachedSessionUserState = () => ({
  user: cachedSessionUser,
  resolved: hasResolvedSessionUser,
  fresh: hasResolvedSessionUser && Date.now() - cachedAt < SESSION_USER_CACHE_TTL_MS,
});

export const setCachedSessionUser = (user: SerializedPublicUser | null) => {
  cachedSessionUser = user;
  hasResolvedSessionUser = true;
  cachedAt = Date.now();
};

export const clearCachedSessionUser = () => {
  cachedSessionUser = null;
  hasResolvedSessionUser = false;
  cachedAt = 0;
};
