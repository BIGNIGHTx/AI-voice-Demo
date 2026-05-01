'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, Shield, Users, User, KeyRound } from 'lucide-react';

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
          <section className="mb-6 rounded-[24px] border border-white bg-gradient-to-br from-white via-[#fcfdfe] to-[#f4f7f9] p-6 text-slate-800 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] ring-1 ring-slate-100 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-wide text-emerald-600 shadow-sm">
                  <KeyRound className="h-3 w-3" strokeWidth={2.5} />
                  Admin Only
                </span>
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-[26px]">จัดการสิทธิ์ผู้ใช้</h1>
                  <p className="max-w-xl text-[13px] leading-relaxed text-slate-500 font-medium lg:text-sm">
                    หน้าเดียวสำหรับสลับสิทธิ์ Admin/User ที่ถูกบันทึกใน audit log อย่างปลอดภัย
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadUsers(true)}
                disabled={refreshing}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-[13px] font-bold text-emerald-600 shadow-sm transition-all hover:bg-emerald-50 hover:border-emerald-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 lg:mt-2"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" strokeWidth={2.5} />}
                {refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรชรายชื่อ'}
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {/* Card 1: ผู้ใช้ทั้งหมด */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                    <Users className="h-5 w-5 text-slate-500" strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-bold text-slate-700">ผู้ใช้ทั้งหมด</span>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black leading-none text-slate-900">{stats.total}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">(USERS)</p>
                </div>
              </div>

              {/* Card 2: ผู้ดูแลระบบ */}
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/50 to-white p-4 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/10">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100/50 border border-emerald-200/50">
                    <KeyRound className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-bold text-emerald-800">ผู้ดูแลระบบ</span>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black leading-none text-emerald-700">{stats.admins}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">(ADMINS)</p>
                </div>
              </div>

              {/* Card 3: ผู้ใช้ทั่วไป */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                    <User className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-bold text-slate-700">ผู้ใช้ทั่วไป</span>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black leading-none text-slate-900">{stats.standardUsers}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">(STANDARD USERS)</p>
                </div>
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
                  <article key={user.id} className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                      <div className="grid flex-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

                        {/* 1. User Info */}
                        <div className="flex flex-col">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">ข้อมูลผู้ใช้</p>
                          <div className="flex flex-1 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100 text-lg font-bold text-slate-600 shadow-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate text-sm font-bold text-slate-800">{user.name}</h3>
                                {isCurrentUser && (
                                  <span className="shrink-0 rounded-full border border-sky-200/60 bg-sky-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-sky-600">YOU</span>
                                )}
                              </div>
                              <p className="truncate text-xs font-medium text-slate-500 mt-0.5">{user.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* 2. Role Info */}
                        <div className="flex flex-col">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">สิทธิ์ (Role)</p>
                          <div className="flex flex-1 flex-col justify-center items-start">
                            <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-sm transition-colors ${user.role === 'admin'
                                ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700'
                                : 'border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-600'
                              }`}>
                              {user.role === 'admin' ? <KeyRound className="h-3.5 w-3.5" strokeWidth={2.5} /> : <User className="h-3.5 w-3.5" strokeWidth={2.5} />}
                              {user.role}
                              {user.id === firstAdminId && (
                                <span className="ml-1 border-l border-emerald-300/50 pl-2 text-[9px] text-emerald-600">FIRST ADMIN</span>
                              )}
                            </span>
                            <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                              Audit events: <span className="font-bold text-slate-600">{user._count.auditLogs}</span>
                            </p>
                          </div>
                        </div>

                        {/* 3. Created At */}
                        <div className="flex flex-col">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">สร้างบัญชีเมื่อ</p>
                          <div className="flex flex-1 flex-col justify-center">
                            <p className="text-sm font-semibold text-slate-700">{formatDateTime(user.createdAt)}</p>
                          </div>
                        </div>

                        {/* 4. Last Login */}
                        <div className="flex flex-col">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">เข้าใช้ล่าสุด</p>
                          <div className="flex flex-1 flex-col justify-center">
                            <p className="text-sm font-semibold text-slate-700">{formatDateTime(user.lastLoginAt)}</p>
                          </div>
                        </div>

                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-col gap-2 xl:w-[220px]">
                        <button
                          type="button"
                          onClick={() => void handleRoleToggle(user)}
                          disabled={isCurrentUser || isUpdating || isProtectedFirstAdmin}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition-all duration-200
                            ${(isCurrentUser || isUpdating || isProtectedFirstAdmin)
                              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                              : user.role === 'admin'
                                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md active:scale-[0.98]'
                                : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 hover:shadow-md hover:shadow-emerald-500/20 active:scale-[0.98]'
                            }
                          `}
                        >
                          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" strokeWidth={2.5} />}
                          {isUpdating ? 'กำลังอัปเดต...' : nextRoleLabel}
                        </button>

                        <div className="h-[28px] flex items-center justify-center">
                          {isCurrentUser ? (
                            <p className="text-center text-[10px] font-medium leading-tight text-slate-400">
                              ไม่สามารถเปลี่ยนสิทธิ์บัญชีปัจจุบัน
                            </p>
                          ) : isProtectedFirstAdmin ? (
                            <p className="text-center text-[10px] font-medium leading-tight text-slate-400">
                              Admin คนแรกถูกล็อกสิทธิ์
                            </p>
                          ) : (
                            <p className="text-center text-[10px] font-medium leading-tight text-slate-400 opacity-60">
                              สลับสิทธิ์การเข้าถึงข้อมูล
                            </p>
                          )}
                        </div>
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
