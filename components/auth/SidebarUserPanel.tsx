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
      <div className="rounded-3xl bg-white p-3 text-slate-800 border border-slate-200 shadow-sm sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-200">
            {initials}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="mt-3 hidden items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:flex border border-slate-100">
          <span className="font-medium">สิทธิ์การใช้งาน</span>
          <span className="rounded-lg bg-white px-2 py-1 uppercase tracking-wider font-bold text-[10px] text-blue-700 border border-blue-100">
            {user.role}
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          suppressHydrationWarning
          className="mt-3 hidden w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-rose-600 hover:border-rose-100 disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          suppressHydrationWarning
          className="mt-3 flex h-10 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition-all hover:bg-slate-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
          aria-label="ออกจากระบบ"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
