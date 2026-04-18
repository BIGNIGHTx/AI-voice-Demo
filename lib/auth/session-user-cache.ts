import type { SerializedPublicUser } from '@/lib/auth/user';

let cachedSessionUser: SerializedPublicUser | null = null;
let hasResolvedSessionUser = false;

export const getCachedSessionUserState = () => ({
  user: cachedSessionUser,
  resolved: hasResolvedSessionUser,
});

export const setCachedSessionUser = (user: SerializedPublicUser | null) => {
  cachedSessionUser = user;
  hasResolvedSessionUser = true;
};

export const clearCachedSessionUser = () => {
  cachedSessionUser = null;
  hasResolvedSessionUser = false;
};
