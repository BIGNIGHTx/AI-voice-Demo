'use client';

import Sidebar from '@/components/Sidebar';
import {
  Search,
  Users,
  Phone,
  ChevronRight,
  Loader2,
  AlertCircle,
  UserCircle,
  RotateCw,
  ShieldCheck,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
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
  agent_id?: string;
  brand?: string;
  product_category?: string;
  sale_channel?: string;
  total_calls: number;
  last_call_date?: string;
  sentiment_summary?: string;
  has_warranty: boolean;
  warranty_count: number;
  call_type?: string;
  call_type_counts?: { inbound: number; outbound: number; unknown: number };
}

const isActiveWarrantyRecord = (item: unknown): boolean => {
  if (typeof item !== 'object' || item === null) return false;
  const record = item as { status?: string; registration_no?: string };
  const normalizedStatus = String(record.status || '').trim().toUpperCase();
  const normalizedRegistration = String(record.registration_no || '').trim().toUpperCase();
  return normalizedStatus !== 'DELETED' && !normalizedRegistration.startsWith('DELETED-');
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [warrantyFilter, setWarrantyFilter] = useState<'all' | 'with' | 'without'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalWithWarranty, setTotalWithWarranty] = useState(0);
  const [totalWithoutWarranty, setTotalWithoutWarranty] = useState(0);
  const perPage = 12;

  const fetchCustomers = useCallback(async (silent = false) => {
    const isSilent = typeof silent === 'boolean' ? silent : false;
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
      if (searchQuery) params.set('search', searchQuery);
      if (warrantyFilter === 'with') params.set('has_warranty', 'true');
      if (warrantyFilter === 'without') params.set('has_warranty', 'false');

      const res = await fetch(`${API_BASE}/api/v1/customers?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const baseCustomers: Customer[] = data.customers || [];
      const normalizedCustomers = await Promise.all(
        baseCustomers.map(async (customer) => {
          if (!customer.has_warranty) return customer;

          try {
            const detailRes = await fetch(
              `${API_BASE}/api/v1/customers/${encodeURIComponent(customer.customer_id)}`,
              { cache: 'no-store' }
            );

            if (!detailRes.ok) return customer;

            const detailData = await detailRes.json();
            const activeWarrantyCount = Array.isArray(detailData?.warranties)
              ? detailData.warranties.filter(isActiveWarrantyRecord).length
              : 0;

            return {
              ...customer,
              has_warranty: activeWarrantyCount > 0,
              warranty_count: activeWarrantyCount,
            };
          } catch {
            return customer;
          }
        })
      );

      setCustomers(normalizedCustomers);
      const visibleTotalWithWarranty = normalizedCustomers.filter((customer) => customer.has_warranty).length;
      const visibleTotalWithoutWarranty = normalizedCustomers.length - visibleTotalWithWarranty;

      setTotalPages(data.total_pages || 1);
      setTotal(data.total || normalizedCustomers.length);
      setTotalWithWarranty(visibleTotalWithWarranty);
      setTotalWithoutWarranty(visibleTotalWithoutWarranty);
    } catch (err) {
      setError(`ไม่สามารถเชื่อมต่อ API ได้: ${err instanceof Error ? err.message : 'Unknown error'}`);
      if (!isSilent) {
        setCustomers([]);
        setTotal(0);
        setTotalWithWarranty(0);
        setTotalWithoutWarranty(0);
        setTotalPages(1);
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [page, searchQuery, warrantyFilter]);

  useEffect(() => {
    fetchCustomers();

    const interval = setInterval(() => {
      fetchCustomers(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchCustomers]);

  const getSentimentBadge = (s?: string) => {
    switch (s?.toUpperCase()) {
      case 'POSITIVE': return { cls: 'bg-emerald-50 text-emerald-600 border border-emerald-100', label: 'พอใจ' };
      case 'NEGATIVE': return { cls: 'bg-red-50 text-red-500 border border-red-100', label: 'ไม่พอใจ' };
      default: return { cls: 'bg-slate-100 text-slate-500 border border-slate-200', label: 'กลาง' };
    }
  };

  const getCallTypeBadge = (callType?: string) => {
    switch (callType?.toLowerCase()) {
      case 'inbound':
        return { cls: 'bg-blue-50 text-blue-600 border border-blue-100', label: 'Inbound', icon: <PhoneIncoming size={10} /> };
      case 'outbound':
        return { cls: 'bg-orange-50 text-orange-600 border border-orange-100', label: 'Outbound', icon: <PhoneOutgoing size={10} /> };
      case 'mixed':
        return { cls: 'bg-purple-50 text-purple-600 border border-purple-100', label: 'Mixed', icon: <Phone size={10} /> };
      default:
        return { cls: 'bg-slate-50 text-slate-400 border border-slate-200', label: 'ไม่ระบุที่มา', icon: <PhoneMissed size={10} /> };
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
      <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
        <div className="max-w-full mx-auto">

          {/* Header */}
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-indigo-100/20 shadow-[0_4px_15px_-3px_rgba(99,102,241,0.1),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_6px_rgba(99,102,241,0.1)] sm:h-14 sm:w-14">
                <Users size={26} strokeWidth={1.5} className="text-indigo-600 drop-shadow-sm" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Customers</h1>
                <p className="text-slate-400 text-sm font-medium">ค้นหาและดูข้อมูลลูกค้าพร้อมประวัติการติดต่อ</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="text-right">
                <div className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">{total.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</div>
              </div>
              <div className="hidden h-10 w-px bg-slate-200 sm:block"></div>
              <div className="text-right">
                <div className="text-2xl font-black tracking-tight text-emerald-600 sm:text-3xl">{totalWithWarranty}</div>
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">มีประกัน</div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setWarrantyFilter('all'); setPage(1); }}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${warrantyFilter === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              ทั้งหมด ({total})
            </button>
            <button
              onClick={() => { setWarrantyFilter('with'); setPage(1); }}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${warrantyFilter === 'with'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              มีประกัน ({totalWithWarranty})
            </button>
            <button
              onClick={() => { setWarrantyFilter('without'); setPage(1); }}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${warrantyFilter === 'without'
                ? 'bg-slate-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              ไม่มีประกัน ({totalWithoutWarranty})
            </button>
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
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start space-x-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-red-800">เชื่อมต่อ API ไม่สำเร็จ</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Customer List */}
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
              <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 mb-6">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Customer Library</h3>
                    <p className="text-xs text-slate-500">Format เดียวกับหน้า Files แต่ยังคงรายละเอียดครบ</p>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    แสดง <span className="text-slate-600 font-bold">{customers.length}</span> จาก {total} รายการ
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1180px]">
                    <thead>
                      <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="p-4 pl-6">Customer</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4">Agent</th>
                        <th className="p-4">Brand</th>
                        <th className="p-4">Product</th>
                        <th className="p-4">Sentiment</th>
                        <th className="p-4">Warranty</th>
                        <th className="p-4">Call Type</th>
                        <th className="p-4">Calls</th>
                        <th className="p-4">Last Call</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {customers.map((c) => {
                        const sentiment = getSentimentBadge(c.sentiment_summary);
                        const callType = getCallTypeBadge(c.call_type);
                        return (
                          <tr
                            key={c.customer_id}
                            onClick={() => router.push(`/customers/${c.customer_id}`)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-sm group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                  {c.first_name?.[0] || '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{c.first_name} {c.last_name}</p>
                                  <p className="text-[11px] text-slate-400 truncate">ID: {c.customer_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{c.phone || '-'}</td>
                            <td className="p-4">
                              <p className="text-sm font-semibold text-slate-700">{c.agent_id || '-'}</p>
                              <p className="text-[11px] text-slate-400">{c.sale_channel || '-'}</p>
                            </td>
                            <td className="p-4 text-sm text-slate-700 whitespace-nowrap">{c.brand || '-'}</td>
                            <td className="p-4 text-sm text-slate-700 max-w-48 truncate">{c.product_category || '-'}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${sentiment.cls}`}>
                                {sentiment.label}
                              </span>
                            </td>
                            <td className="p-4">
                              {c.has_warranty ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  <ShieldCheck size={12} />
                                  ประกัน {c.warranty_count}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  ไม่มีประกัน
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${callType.cls}`}>
                                {callType.icon}
                                {callType.label}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-1">
                                IN {c.call_type_counts?.inbound ?? 0} / OUT {c.call_type_counts?.outbound ?? 0}
                              </p>
                            </td>
                            <td className="p-4 text-sm font-semibold text-slate-800">{c.total_calls}</td>
                            <td className="p-4 text-sm text-slate-500 whitespace-nowrap">{formatDate(c.last_call_date)}</td>
                            <td className="p-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/customers/${c.customer_id}`);
                                }}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                                title="ดูรายละเอียด"
                              >
                                <ChevronRight size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

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
                      className={`w-9 h-9 rounded-full text-sm font-medium cursor-pointer transition-colors ${p === page ? 'bg-blue-700 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
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
