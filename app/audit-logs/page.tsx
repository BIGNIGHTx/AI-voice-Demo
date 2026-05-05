'use client';

import { useEffect, useMemo, useState } from 'react';
import { History, Loader2, LogIn, Search, ShieldAlert, ShieldCheck, RefreshCw, Trash2, Activity, AlertCircle, MousePointerClick } from 'lucide-react';

import Sidebar from '@/components/Sidebar';

interface AuditLogRow {
  id: string;
  action: string;
  target: string | null;
  routePath: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

const actionLabels: Record<string, string> = {
  USER_REGISTERED: 'สมัครสมาชิก',
  LOGIN_SUCCESS: 'Login สำเร็จ',
  LOGIN_FAILED: 'Login ไม่สำเร็จ',
  LOGOUT: 'ออกจากระบบ',
  PAGE_VIEW: 'เปิดหน้าในระบบ',
  AUDIO_FILE_UPLOADED: 'อัปโหลดไฟล์เสียง',
  AUDIO_ANALYSIS_REQUESTED: 'สั่งวิเคราะห์ไฟล์เสียง',
  AUDIO_FILE_DELETED: 'ลบไฟล์เสียง',
  AUDIO_FILES_BULK_DELETED: 'ลบไฟล์เสียงหลายรายการ',
  CUSTOMER_PROFILE_UPDATED: 'แก้ไขข้อมูลลูกค้า',
  WARRANTY_CREATED: 'สร้างข้อมูลประกัน',
  WARRANTY_UPDATED: 'แก้ไขข้อมูลประกัน',
  WARRANTY_DELETED: 'ลบข้อมูลประกัน',
  WARRANTY_SYNC_TRIGGERED: 'ซิงค์ Warranty DB',
  USER_ROLE_UPDATED: 'เปลี่ยนสิทธิ์ผู้ใช้',
};

const actionStyles: Record<string, string> = {
  USER_REGISTERED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  LOGIN_SUCCESS: 'border-sky-200 bg-sky-50 text-sky-700',
  LOGIN_FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
  LOGOUT: 'border-slate-200 bg-slate-100 text-slate-700',
  PAGE_VIEW: 'border-violet-200 bg-violet-50 text-violet-700',
  AUDIO_FILE_UPLOADED: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  AUDIO_ANALYSIS_REQUESTED: 'border-amber-200 bg-amber-50 text-amber-700',
  AUDIO_FILE_DELETED: 'border-rose-200 bg-rose-50 text-rose-700',
  AUDIO_FILES_BULK_DELETED: 'border-red-200 bg-red-50 text-red-700',
  CUSTOMER_PROFILE_UPDATED: 'border-blue-200 bg-blue-50 text-blue-700',
  WARRANTY_CREATED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  WARRANTY_UPDATED: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  WARRANTY_DELETED: 'border-orange-200 bg-orange-50 text-orange-700',
  WARRANTY_SYNC_TRIGGERED: 'border-teal-200 bg-teal-50 text-teal-700',
  USER_ROLE_UPDATED: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
};

const formatDateTime = (value: string) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

const getMetadataSummary = (metadata: string | null) => {
  if (!metadata) return null;

  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    const parts = [
      typeof parsed.reason === 'string' ? `เหตุผล: ${parsed.reason}` : null,
      typeof parsed.fileName === 'string' ? `ไฟล์: ${parsed.fileName}` : null,
      typeof parsed.registrationNo === 'string' ? `Reg: ${parsed.registrationNo}` : null,
      typeof parsed.customerName === 'string' ? `ลูกค้า: ${parsed.customerName}` : null,
      typeof parsed.brand === 'string' ? `แบรนด์: ${parsed.brand}` : null,
      typeof parsed.model === 'string' ? `รุ่น: ${parsed.model}` : null,
      typeof parsed.previousRole === 'string' ? `จาก: ${parsed.previousRole}` : null,
      typeof parsed.nextRole === 'string' ? `เป็น: ${parsed.nextRole}` : null,
      typeof parsed.updatedBy === 'string' ? `แก้โดย: ${parsed.updatedBy}` : null,
      typeof parsed.deletedCount === 'number' ? `ลบสำเร็จ: ${parsed.deletedCount}` : null,
      typeof parsed.failedCount === 'number' ? `ลบไม่สำเร็จ: ${parsed.failedCount}` : null,
      typeof parsed.successCount === 'number' ? `ซิงค์สำเร็จ: ${parsed.successCount}` : null,
      typeof parsed.total === 'number' ? `ทั้งหมด: ${parsed.total}` : null,
      typeof parsed.source === 'string' ? `แหล่งที่มา: ${parsed.source}` : null,
    ].filter(Boolean);

    if (parts.length > 0) return parts.join(' | ');
  } catch {
    return metadata;
  }

  return null;
};

const getTargetText = (log: AuditLogRow) => log.target || log.routePath || '-';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async (refresh = false) => {
    setError(null);
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/audit-logs?limit=200', { cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 403) {
          setError('หน้านี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น');
          setLoading(false);
          setRefreshing(false);
          return;
        }

        setError('โหลด audit log ไม่สำเร็จ');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const payload = await response.json();
      setLogs(Array.isArray(payload.logs) ? payload.logs : []);
    } catch {
      setError('โหลด audit log ไม่สำเร็จ');
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLogs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
      if (!matchesAction) return false;

      if (!normalizedSearch) return true;

      const searchable = [
        log.user?.name,
        log.user?.email,
        log.action,
        log.target,
        log.routePath,
        getMetadataSummary(log.metadata),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [actionFilter, logs, search]);

  const stats = useMemo(() => {
    const todayKey = new Date().toDateString();

    return {
      total: logs.length,
      loginsToday: logs.filter((log) => log.action === 'LOGIN_SUCCESS' && new Date(log.createdAt).toDateString() === todayKey).length,
      failedLogins: logs.filter((log) => log.action === 'LOGIN_FAILED').length,
      pageViews: logs.filter((log) => log.action === 'PAGE_VIEW').length,
    };
  }, [logs]);

  const handleClearLogs = async () => {
    if (!window.confirm('ต้องการล้าง audit logs ทั้งหมดใช่หรือไม่?')) {
      return;
    }

    setError(null);
    setClearing(true);

    try {
      const response = await fetch('/api/audit-logs', { method: 'DELETE' });

      if (!response.ok) {
        if (response.status === 403) {
          setError('หน้านี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น');
        } else {
          setError('ล้าง audit log ไม่สำเร็จ');
        }
        return;
      }

      setLogs([]);
    } catch {
      setError('ล้าง audit log ไม่สำเร็จ');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-full p-5 sm:p-6 lg:p-8">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
                  <History size={28} strokeWidth={2.4} />
                </div>
                <div>
                  <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-900">
                    Audit <span className="text-blue-600">Logs</span>
                  </h1>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    ตรวจสอบประวัติการใช้งานและกิจกรรมทั้งหมดในระบบ
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleClearLogs}
                  disabled={clearing || refreshing}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-white px-5 py-2.5 text-[13px] font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50 disabled:opacity-50"
                >
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={2.5} />}
                  {clearing ? 'กำลังล้าง...' : 'Clear Logs'}
                </button>

                <button
                  type="button"
                  onClick={() => void loadLogs(true)}
                  disabled={refreshing || clearing}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white px-5 py-2.5 text-[13px] font-bold text-sky-600 shadow-sm transition-all hover:bg-sky-50 disabled:opacity-50"
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" strokeWidth={2.5} />}
                  {refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรชข้อมูล'}
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Total Events */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-md">
                <div className="flex items-center gap-3 text-slate-500 mb-3">
                  <Activity size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Total Events</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.total}</div>
              </div>

              {/* Card 2: Logins Today */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 transition-all hover:bg-white hover:shadow-md">
                <div className="flex items-center gap-3 text-blue-600 mb-3">
                  <LogIn size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Logins Today</span>
                </div>
                <div className="text-3xl font-black text-blue-700">{stats.loginsToday}</div>
              </div>

              {/* Card 3: Failed Login */}
              <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-4 transition-all hover:bg-white hover:shadow-md">
                <div className="flex items-center gap-3 text-rose-600 mb-3">
                  <AlertCircle size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Failed Login</span>
                </div>
                <div className="text-3xl font-black text-rose-700">{stats.failedLogins}</div>
              </div>

              {/* Card 4: Page Views */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-md">
                <div className="flex items-center gap-3 text-slate-500 mb-3">
                  <MousePointerClick size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Page Views</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.pageViews}</div>
              </div>
            </div>
          </section>

          <div className="mb-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-300 focus-within:bg-white">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="ค้นหาจากชื่อ, อีเมล, action หรือ path"
                />
              </div>

              <select
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-sky-300 focus:bg-white"
              >
                <option value="ALL">ทุก action</option>
                {Object.entries(actionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-200 bg-white text-slate-500 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-medium">
                <Loader2 className="h-5 w-5 animate-spin" />
                กำลังโหลด audit log...
              </div>
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
              {error}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่ค้นหา
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const metadataSummary = getMetadataSummary(log.metadata);

                return (
                  <article key={log.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${actionStyles[log.action] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                            {actionLabels[log.action] ?? log.action}
                          </span>
                          <span className="text-xs font-medium text-slate-400">{formatDateTime(log.createdAt)}</span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">ผู้ใช้</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{log.user?.name ?? 'ไม่ระบุผู้ใช้'}</p>
                            <p className="text-sm text-slate-500">{log.user?.email ?? '-'}</p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">เป้าหมาย</p>
                            <p className="mt-2 break-all text-sm font-medium text-slate-800">{getTargetText(log)}</p>
                            <p className="text-sm text-slate-500">{log.routePath ? `Route: ${log.routePath}` : 'ไม่มี route เพิ่มเติม'}</p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">อุปกรณ์และเครือข่าย</p>
                            <p className="mt-2 text-sm font-medium text-slate-800">IP: {log.ipAddress ?? '-'}</p>
                            <p className="line-clamp-2 text-sm text-slate-500">{log.userAgent ?? 'ไม่พบ user agent'}</p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">รายละเอียดเพิ่ม</p>
                            <p className="mt-2 text-sm text-slate-700">{metadataSummary ?? 'ไม่มี metadata เพิ่มเติม'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-start gap-2">
                        {log.action === 'LOGIN_FAILED' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            ตรวจสอบการเข้าสู่ระบบ
                          </span>
                        ) : log.action === 'LOGIN_SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                            <LogIn className="h-3.5 w-3.5" />
                            Active Session
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Logged
                          </span>
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
