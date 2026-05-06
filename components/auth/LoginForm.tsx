'use client';

import Link from 'next/link';
import { Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DEFAULT_AUTH_REDIRECT, sanitizeNextPath } from '@/lib/auth/routes';

interface LoginFormProps {
  initialNextPath?: string | null;
}

const getErrorMessage = async (response: Response) => {
  const fallback = 'เข้าสู่ระบบไม่สำเร็จ';

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

export default function LoginForm({ initialNextPath }: LoginFormProps) {
  const router = useRouter();
  const nextPath = sanitizeNextPath(initialNextPath);
  const registerHref = nextPath === DEFAULT_AUTH_REDIRECT
    ? '/register'
    : `/register?next=${encodeURIComponent(nextPath)}`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
        <label className="text-sm font-semibold text-slate-700" htmlFor="login-email">อีเมล</label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-300 focus-within:bg-white">
          <Mail className="h-4 w-4 text-slate-400" />
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="you@example.com"
            required
            suppressHydrationWarning
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor="login-password">รหัสผ่าน</label>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-300 focus-within:bg-white">
          <LockKeyhole className="h-4 w-4 text-slate-400" />
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="กรอกรหัสผ่าน"
            required
            suppressHydrationWarning
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
        suppressHydrationWarning
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>

      <div className="rounded-2xl bg-sky-50 px-4 py-3 text-xs leading-6 text-sky-800">
        ทุกครั้งที่ login, logout หรือเปิดหน้าภายในระบบ จะถูกบันทึกลง audit log อัตโนมัติ
      </div>

      <p className="text-center text-sm text-slate-500">
        ยังไม่มีบัญชี?{' '}
        <Link href={registerHref} className="font-semibold text-sky-700 transition hover:text-sky-800">
          สมัครสมาชิก
        </Link>
      </p>
    </form>
  );
}
