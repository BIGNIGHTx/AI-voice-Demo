'use client';

import { Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { clearCachedSessionUser } from '@/lib/auth/session-user-cache';
import type { SerializedPublicUser } from '@/lib/auth/user';

interface SidebarUserPanelProps {
  user: SerializedPublicUser | null;
  loading: boolean;
}

const getInitials = (name: string) => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() ?? '')
  .join('') || 'U';

export default function SidebarUserPanel({ user, loading }: SidebarUserPanelProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = useMemo(() => getInitials(user?.name ?? ''), [user?.name]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    clearCachedSessionUser();
    router.replace('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="border-t border-slate-200 p-2 sm:p-4">
        <div className="flex items-center justify-center rounded-2xl bg-slate-900/95 p-4 text-slate-200 sm:justify-start sm:gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="hidden text-sm sm:inline">โหลดผู้ใช้...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="border-t border-slate-200 p-2 sm:p-4">
      <div className="rounded-3xl bg-slate-900 p-3 text-white shadow-[0_10px_30px_rgba(15,23,42,0.28)] sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-sm font-bold text-white">
            {initials}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-slate-300">{user.email}</p>
          </div>
        </div>

        <div className="mt-3 hidden items-center justify-between rounded-2xl bg-white/10 px-3 py-2 text-xs text-slate-200 sm:flex">
          <span>สิทธิ์การใช้งาน</span>
          <span className="rounded-full bg-white/10 px-2 py-1 uppercase tracking-wide">{user.role}</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-3 hidden w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70 sm:flex"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-3 flex h-10 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70 sm:hidden"
          aria-label="ออกจากระบบ"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
