'use client';

import Link from 'next/link';
import { Loader2, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DEFAULT_AUTH_REDIRECT, sanitizeNextPath } from '@/lib/auth/routes';

interface RegisterFormProps {
  initialNextPath?: string | null;
}

const getErrorMessage = async (response: Response) => {
  const fallback = 'สมัครสมาชิกไม่สำเร็จ';

  try {
    const payload = await response.json();
    if (payload && typeof payload === 'object' && typeof payload.message === 'string') {
      return payload.message;
    }
  } catch {
    return fallback;
  }

  return fallback;
};

export default function RegisterForm({ initialNextPath }: RegisterFormProps) {
  const router = useRouter();
  const nextPath = sanitizeNextPath(initialNextPath);
  const loginHref = nextPath === DEFAULT_AUTH_REDIRECT
    ? '/login'
    : `/login?next=${encodeURIComponent(nextPath)}`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response));
        setSubmitting(false);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor="register-name">ชื่อผู้ใช้</label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-300 focus-within:bg-white">
          <UserRound className="h-4 w-4 text-slate-400" />
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="เช่น Nattapon"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor="register-email">อีเมล</label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-300 focus-within:bg-white">
          <Mail className="h-4 w-4 text-slate-400" />
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor="register-password">รหัสผ่าน</label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-300 focus-within:bg-white">
          <LockKeyhole className="h-4 w-4 text-slate-400" />
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="อย่างน้อย 8 ตัวอักษร"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor="register-confirm-password">ยืนยันรหัสผ่าน</label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-300 focus-within:bg-white">
          <LockKeyhole className="h-4 w-4 text-slate-400" />
          <input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="พิมพ์ซ้ำอีกครั้ง"
            required
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitting ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีและเข้าใช้งาน'}
      </button>

      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs leading-6 text-emerald-800">
        หลังสมัคร ระบบจะสร้างบัญชีในฐานข้อมูลจริง พร้อมบันทึก event การสมัครและ login ครั้งแรกให้อัตโนมัติ
      </div>

      <p className="text-center text-sm text-slate-500">
        มีบัญชีอยู่แล้ว?{' '}
        <Link href={loginHref} className="font-semibold text-sky-700 transition hover:text-sky-800">
          กลับไปหน้า login
        </Link>
      </p>
    </form>
  );
}
