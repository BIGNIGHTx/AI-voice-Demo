'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, ShieldCheck, UserCog } from 'lucide-react';

import Sidebar from '@/components/Sidebar';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLoginAt: string | null;
  _count: {
    auditLogs: number;
  };
}

const formatDateTime = (value: string | null) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const roleBadgeClassName = (role: 'admin' | 'user') => (
  role === 'admin'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-100 text-slate-700'
);

const getErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();
    if (payload && typeof payload === 'object' && typeof payload.message === 'string') {
      return payload.message;
    }
  } catch {
    return 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
  }

  return 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [firstAdminId, setFirstAdminId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async (refresh = false) => {
    setError(null);
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });

      if (!response.ok) {
        setError(await getErrorMessage(response));
        setUsers([]);
        return;
      }

      const payload = await response.json();
      setUsers(Array.isArray(payload.users) ? payload.users : []);
      setCurrentUserId(typeof payload.currentUserId === 'string' ? payload.currentUserId : '');
      setFirstAdminId(typeof payload.firstAdminId === 'string' ? payload.firstAdminId : '');
    } catch {
      setError('โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return users;

    return users.filter((user) => (
      `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(normalizedSearch)
    ));
  }, [search, users]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((user) => user.role === 'admin').length,
    standardUsers: users.filter((user) => user.role === 'user').length,
  }), [users]);

  const handleRoleToggle = async (user: AdminUserRow) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    setUpdatingId(user.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response));
        return;
      }

      const payload = await response.json();
      const updatedUser = payload.user as AdminUserRow | undefined;

      if (!updatedUser) {
        setError('อัปเดตสิทธิ์ไม่สำเร็จ');
        return;
      }

      setUsers((currentUsers) => currentUsers.map((currentUser) => (
        currentUser.id === updatedUser.id
          ? { ...currentUser, ...updatedUser }
          : currentUser
      )));
    } catch {
      setError('อัปเดตสิทธิ์ไม่สำเร็จ');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-full p-5 sm:p-6 lg:p-8">
          <section className="mb-6 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1f2937_48%,#065f46_100%)] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  <UserCog className="h-3.5 w-3.5" />
                  Admin Only
                </span>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold sm:text-3xl">จัดการสิทธิ์ผู้ใช้</h1>
                  <p className="max-w-3xl text-sm leading-6 text-slate-200">
                    หน้าเดียวสำหรับสลับสิทธิ์ระหว่าง Admin และ User โดย Admin เท่านั้นที่เข้าถึงได้ และทุกการเปลี่ยน role จะถูกบันทึกลง audit log
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadUsers(true)}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรชรายชื่อ'}
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Users</p>
                <p className="mt-3 text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Admins</p>
                <p className="mt-3 text-3xl font-bold">{stats.admins}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Standard Users</p>
                <p className="mt-3 text-3xl font-bold">{stats.standardUsers}</p>
              </div>
            </div>
          </section>

          <section className="mb-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-emerald-300 focus-within:bg-white">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="ค้นหาจากชื่อ, อีเมล หรือ role"
              />
            </div>
          </section>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-200 bg-white text-slate-500 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-medium">
                <Loader2 className="h-5 w-5 animate-spin" />
                กำลังโหลดข้อมูลผู้ใช้...
              </div>
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
              {error}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              ไม่พบผู้ใช้ตามคำค้นหา
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                const isProtectedFirstAdmin = user.id === firstAdminId && currentUserId !== firstAdminId;
                const isUpdating = updatingId === user.id;
                const nextRoleLabel = user.role === 'admin' ? 'เปลี่ยนเป็น User' : 'เปลี่ยนเป็น Admin';

                return (
                  <article key={user.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
                        <div className="flex min-h-[96px] flex-col justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">ผู้ใช้</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                            {isCurrentUser ? (
                              <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
                                Current Session
                              </span>
                            ) : null}
                            {user.id === firstAdminId ? (
                              <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                First Admin
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>

                        <div className="flex min-h-[96px] flex-col justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Role</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase ${roleBadgeClassName(user.role)}`}>
                              {user.role}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">Audit events: {user._count.auditLogs}</p>
                        </div>

                        <div className="flex min-h-[96px] flex-col justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">สร้างบัญชีเมื่อ</p>
                          <div className="mt-4 flex items-center">
                            <p className="text-sm font-medium text-slate-800">{formatDateTime(user.createdAt)}</p>
                          </div>
                          <p className="invisible mt-1 text-sm leading-5">placeholder</p>
                        </div>

                        <div className="flex min-h-[96px] flex-col justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">เข้าใช้ล่าสุด</p>
                          <div className="mt-4 flex items-center">
                            <p className="text-sm font-medium text-slate-800">{formatDateTime(user.lastLoginAt)}</p>
                          </div>
                          <p className="invisible mt-1 text-sm leading-5">placeholder</p>
                        </div>
                      </div>

                      <div className="flex h-full flex-col justify-between gap-3 xl:w-[260px]">
                        <button
                          type="button"
                          onClick={() => void handleRoleToggle(user)}
                          disabled={isCurrentUser || isUpdating || isProtectedFirstAdmin}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          {isUpdating ? 'กำลังอัปเดต...' : nextRoleLabel}
                        </button>

                        {isCurrentUser ? (
                          <p className="text-center text-xs leading-5 text-slate-400">
                            บัญชีที่ล็อกอินอยู่จะเปลี่ยนสิทธิ์จากหน้านี้ไม่ได้
                          </p>
                        ) : isProtectedFirstAdmin ? (
                          <p className="text-center text-xs leading-5 text-slate-400">
                            Admin คนแรกถูกล็อกไว้ บัญชี admin อื่นเปลี่ยนสิทธิ์ไม่ได้
                          </p>
                        ) : (
                          <p className="text-center text-xs leading-5 text-slate-400">
                            กดครั้งเดียวเพื่อสลับ role ระหว่าง Admin และ User
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
