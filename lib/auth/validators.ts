import { MIN_PASSWORD_LENGTH } from '@/lib/auth/password';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const parseLoginInput = (payload: unknown): ValidationResult<LoginInput> => {
  const body = asRecord(payload);
  if (!body) return { success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' };

  const email = normalizeEmail(toText(body.email));
  const password = toText(body.password);

  if (!email || !EMAIL_PATTERN.test(email)) {
    return { success: false, error: 'กรอกอีเมลให้ถูกต้อง' };
  }

  if (!password) {
    return { success: false, error: 'กรอกรหัสผ่าน' };
  }

  return { success: true, data: { email, password } };
};

export const parseRegisterInput = (payload: unknown): ValidationResult<RegisterInput> => {
  const body = asRecord(payload);
  if (!body) return { success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' };

  const name = toText(body.name);
  const email = normalizeEmail(toText(body.email));
  const password = toText(body.password);

  if (name.length < 2) {
    return { success: false, error: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 2 ตัวอักษร' };
  }

  if (!email || !EMAIL_PATTERN.test(email)) {
    return { success: false, error: 'กรอกอีเมลให้ถูกต้อง' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`
    };
  }

  return { success: true, data: { name, email, password } };
};
