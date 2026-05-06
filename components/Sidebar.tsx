'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, FileText, Folder, Users, ShieldCheck, History, UserCog } from 'lucide-react';

import SidebarUserPanel from '@/components/auth/SidebarUserPanel';
import { isAdminRole } from '@/lib/auth/role';
import {
  clearCachedSessionUser,
  getCachedSessionUserState,
  setCachedSessionUser,
} from '@/lib/auth/session-user-cache';
import type { SerializedPublicUser } from '@/lib/auth/user';

export default function Sidebar() {
  const pathname = usePathname();
  const cachedSessionState = getCachedSessionUserState();
  const [user, setUser] = useState<SerializedPublicUser | null>(cachedSessionState.user);
  const [loadingUser, setLoadingUser] = useState(!cachedSessionState.resolved);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });

        if (!active) return;

        if (!response.ok) {
          clearCachedSessionUser();
          setUser(null);
          setLoadingUser(false);
          return;
        }

        const payload = await response.json();
        const nextUser = payload.user ?? null;
        setCachedSessionUser(nextUser);
        setUser(nextUser);
      } catch {
        if (!active) return;
      } finally {
        if (active) {
          setLoadingUser(false);
        }
      }
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  const canViewAuditLogs = isAdminRole(user?.role);

  return (
    <aside className="flex h-screen w-20 shrink-0 flex-col justify-between overflow-hidden border-r border-slate-200 bg-slate-50 sm:w-56 lg:w-60 xl:w-64">
      <div className="overflow-y-auto">
        <div className="flex items-center justify-center gap-3 px-3 py-4 sm:justify-start sm:px-4 sm:py-5 lg:px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white sm:h-10 sm:w-10">
            <Folder className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <span className="hidden text-base font-bold text-slate-800 sm:inline lg:text-lg">File Manager</span>
        </div>

        <nav className="mt-4 space-y-1.5 px-2 sm:px-3 lg:px-4">
          <Link href="/dashboard" prefetch={true} title="Dashboard" className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors cursor-pointer sm:justify-start sm:px-4 ${pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link href="/customers" prefetch={true} title="Customers" className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors cursor-pointer sm:justify-start sm:px-4 ${pathname.includes('/customers') ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Users className="h-5 w-5 shrink-0" />
            <span className="hidden sm:inline">Customers</span>
          </Link>
          <Link href="/files" prefetch={true} title="Files" className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors cursor-pointer sm:justify-start sm:px-4 ${pathname.includes('/files') ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <FileText className="h-5 w-5 shrink-0" />
            <span className="hidden sm:inline">Files</span>
          </Link>

          <Link href="/warranty" prefetch={true} title="Warranty DB" className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors cursor-pointer sm:justify-start sm:px-4 ${pathname === '/warranty' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <ShieldCheck className={`h-5 w-5 shrink-0 ${pathname === '/warranty' ? 'text-blue-700' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Warranty DB</span>
          </Link>

          {canViewAuditLogs ? (
            <Link href="/admin/users" prefetch={true} title="User Access" className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors cursor-pointer sm:justify-start sm:px-4 ${pathname.startsWith('/admin') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}>
              <UserCog className={`h-5 w-5 shrink-0 ${pathname.startsWith('/admin') ? 'text-emerald-700' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">User Access</span>
            </Link>
          ) : null}

          {canViewAuditLogs ? (
            <Link href="/audit-logs" prefetch={true} title="Audit Logs" className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors cursor-pointer sm:justify-start sm:px-4 ${pathname === '/audit-logs' ? 'bg-cyan-50 text-cyan-700' : 'text-slate-500 hover:bg-slate-100'}`}>
              <History className={`h-5 w-5 shrink-0 ${pathname === '/audit-logs' ? 'text-cyan-700' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Audit Logs</span>
            </Link>
          ) : null}

        </nav>
      </div>

      <SidebarUserPanel user={user} loading={loadingUser} />
    </aside>
  );
}
