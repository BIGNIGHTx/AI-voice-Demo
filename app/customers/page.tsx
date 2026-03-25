'use client';

import Sidebar from '@/components/Sidebar';
import {
  Search,
  Users,
  Phone,
  Mail,
  ChevronRight,
  Loader2,
  AlertCircle,
  UserCircle,
  RotateCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Customer {
  customer_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  gender?: string;
  total_calls: number;
  last_call_date?: string;
  sentiment_summary?: string;
}

// Mock data สำหรับแสดงตัวอย่าง (จะถูกแทนที่ด้วย API จริง)
const MOCK_CUSTOMERS: Customer[] = [
  { customer_id: 'C001', first_name: 'สมชาย', last_name: 'ใจดี', phone: '081-234-5678', email: 'somchai@email.com', gender: 'MALE', total_calls: 3, last_call_date: '2026-03-20', sentiment_summary: 'POSITIVE' },
  { customer_id: 'C002', first_name: 'สมหญิง', last_name: 'รักษ์ดี', phone: '089-876-5432', email: 'somying@email.com', gender: 'FEMALE', total_calls: 1, last_call_date: '2026-03-18', sentiment_summary: 'NEUTRAL' },
  { customer_id: 'C003', first_name: 'วิชัย', last_name: 'สุขสันต์', phone: '062-111-2222', email: 'wichai@email.com', gender: 'MALE', total_calls: 5, last_call_date: '2026-03-22', sentiment_summary: 'NEGATIVE' },
  { customer_id: 'C004', first_name: 'นภา', last_name: 'แสงทอง', phone: '091-333-4444', email: 'napa@email.com', gender: 'FEMALE', total_calls: 2, last_call_date: '2026-03-15', sentiment_summary: 'POSITIVE' },
  { customer_id: 'C005', first_name: 'ธนา', last_name: 'มั่นคง', phone: '085-555-6666', email: 'tana@email.com', gender: 'MALE', total_calls: 4, last_call_date: '2026-03-23', sentiment_summary: 'POSITIVE' },
  { customer_id: 'C006', first_name: 'พิมพ์ใจ', last_name: 'เย็นชื่น', phone: '093-777-8888', email: 'pimjai@email.com', gender: 'FEMALE', total_calls: 7, last_call_date: '2026-03-24', sentiment_summary: 'NEUTRAL' },
];

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 12;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`${API_BASE}/api/v1/customers?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch {
      // ใช้ mock data เมื่อ API ไม่พร้อม
      const filtered = MOCK_CUSTOMERS.filter(c =>
        !searchQuery ||
        c.first_name.includes(searchQuery) ||
        c.last_name.includes(searchQuery) ||
        c.phone.includes(searchQuery)
      );
      setCustomers(filtered);
      setTotal(filtered.length);
      setTotalPages(Math.ceil(filtered.length / perPage));
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const getSentimentBadge = (s?: string) => {
    switch (s?.toUpperCase()) {
      case 'POSITIVE': return { cls: 'bg-emerald-50 text-emerald-600 border border-emerald-100', label: 'พอใจ' };
      case 'NEGATIVE': return { cls: 'bg-red-50 text-red-500 border border-red-100', label: 'ไม่พอใจ' };
      default: return { cls: 'bg-slate-100 text-slate-500 border border-slate-200', label: 'กลาง' };
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-full mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
                <span className="text-blue-600"><Users size={26} /></span> ลูกค้าทั้งหมด
              </h1>
              <p className="text-slate-500 text-sm mt-1">ค้นหาและดูข้อมูลลูกค้าพร้อมประวัติการติดต่อ</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-slate-800">{total.toLocaleString()}</div>
              <div className="text-xs text-slate-400">ลูกค้าทั้งหมด</div>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาด้วยชื่อ นามสกุล หรือเบอร์โทรศัพท์..."
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <Search size={18} />
                ค้นหา
              </button>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setPage(1); }}
                className="p-3.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <RotateCw size={18} />
              </button>
            </div>
          </form>

          {/* Error Notice */}
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start space-x-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-amber-800">แสดงข้อมูลตัวอย่าง (API ไม่พร้อมใช้งาน)</p>
                <p className="text-xs text-amber-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Customer Cards Grid */}
          {loading ? (
            <div className="text-center py-20">
              <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-500">กำลังโหลดข้อมูลลูกค้า...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <UserCircle size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">ไม่พบข้อมูลลูกค้า</p>
              <p className="text-slate-400 text-sm mt-2">ลองเปลี่ยนคำค้นหา</p>
            </div>
          ) : (
            <>
              <div className="text-xs text-slate-400 mb-4 font-medium">
                แสดง <span className="text-slate-600 font-bold">{customers.length}</span> จาก {total} รายการ
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                {customers.map((c) => {
                  const badge = getSentimentBadge(c.sentiment_summary);
                  return (
                    <div
                      key={c.customer_id}
                      onClick={() => router.push(`/customers/${c.customer_id}`)}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group p-5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg">
                            {c.first_name?.[0] || '?'}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                              {c.first_name} {c.last_name}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">ID: {c.customer_id}</p>
                          </div>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-slate-400 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate text-xs">{c.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-slate-800">{c.total_calls}</span>
                          <span className="text-xs text-slate-400 ml-1">ครั้งที่โทร</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-slate-400">ล่าสุด</p>
                          <p className="text-xs text-slate-600 font-medium">{formatDate(c.last_call_date)}</p>
                        </div>
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-5 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm cursor-pointer disabled:opacity-30 transition-colors"
                  >
                    ← ก่อนหน้า
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                        p === page ? 'bg-blue-700 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-5 py-2 text-slate-600 font-medium text-sm cursor-pointer disabled:opacity-30 hover:text-slate-800 transition-colors"
                  >
                    ถัดไป →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
