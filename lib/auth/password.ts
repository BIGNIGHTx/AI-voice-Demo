import { compare, hash } from 'bcryptjs';

export const MIN_PASSWORD_LENGTH = 8;

export const hashPassword = (password: string): Promise<string> => hash(password, 12);

export const verifyPassword = (password: string, passwordHash: string): Promise<boolean> =>
  compare(password, passwordHash);
