'use client';

import Sidebar from '@/components/Sidebar';
import {
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Phone,
  User,
  ExternalLink
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ITEMS_PER_PAGE = 10;

interface WarrantyRecord {
  registration_no: string;
  customer_name: string;
  customer_phone: string;
  brand: string;
  category: string;
  size: string;
  serial_no: string;
  warranty_period: string;
  date_of_purchase: string;
  date_of_delivery: string;
  purchase_channel: string;
  order_number: string;
  status: string;
  qdrant_synced: boolean;
  created_at?: string;
}

const isActiveWarrantyRecord = (item: WarrantyRecord): boolean => {
  const normalizedStatus = String(item.status || '').trim().toUpperCase();
  const normalizedRegistration = String(item.registration_no || '').trim().toUpperCase();
  return normalizedStatus !== 'DELETED' && !normalizedRegistration.startsWith('DELETED-');
};

export default function WarrantyDatabasePage() {
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const warrantiesRef = useRef<WarrantyRecord[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    registration_no: '',
    customer_name: '',
    customer_phone: '',
    brand: '',
    category: '',
    size: '',
    serial_no: '',
    warranty_period: '',
    date_of_purchase: '',
    date_of_delivery: '',
    purchase_channel: '',
    order_number: '',
    status: 'Active'
  });

  const fetchWarranties = async ({ silent = false, onlyOnCompletion = false }: { silent?: boolean; onlyOnCompletion?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/warranty/list`, { cache: 'no-store' });
      const data = await res.json();
      const nextWarranties = (data.warranties || []).filter(isActiveWarrantyRecord);

      if (onlyOnCompletion) {
        const previousByRegistration = new Map(
          warrantiesRef.current.map((item) => [item.registration_no, item.qdrant_synced])
        );

        const hasCompletedAnalysis = nextWarranties.some((item: WarrantyRecord) => {
          const previousSynced = previousByRegistration.get(item.registration_no);
          return previousSynced === false && item.qdrant_synced;
        });

        if (hasCompletedAnalysis) {
          setWarranties(nextWarranties);
        }
      } else {
        setWarranties(nextWarranties);
      }
    } catch (error) {
      console.error('Failed to fetch warranties:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchWarranties();
  }, []);

  useEffect(() => {
    warrantiesRef.current = warranties;
  }, [warranties]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initialSearch = new URLSearchParams(window.location.search).get('search') || '';
    setSearchTerm(initialSearch);
  }, []);

  // Auto-refresh when there are pending items
  useEffect(() => {
    const hasPending = warranties.some(w => !w.qdrant_synced);
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchWarranties({ silent: true, onlyOnCompletion: true });
    }, 5000); // Polling every 5 seconds if pending

    return () => clearInterval(interval);
  }, [warranties]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/warranty/sync`, { method: 'POST' });
      const data = await res.json();
      alert(`ซิงค์เสร็จสิ้น: สำเร็จ ${data.success}/${data.total} รายการ`);
      fetchWarranties();
    } catch (error) {
      console.error('Sync failed:', error);
      alert('การซิงค์ล้มเหลว ลบกวนตรวจสอบ Server');
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/v1/warranty/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowAddModal(false);
        setFormData({
          registration_no: '',
          customer_name: '',
          customer_phone: '',
          brand: '',
          category: '',
          size: '',
          serial_no: '',
          warranty_period: '',
          date_of_purchase: '',
          date_of_delivery: '',
          purchase_channel: '',
          order_number: '',
          status: 'Active'
        });
        fetchWarranties();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (error) {
      console.error('Add failed:', error);
    }
  };

  const filteredWarranties = warranties.filter(w =>
    w.registration_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.customer_phone.includes(searchTerm)
  );

  const totalPages = Math.max(1, Math.ceil(filteredWarranties.length / ITEMS_PER_PAGE));
  const paginatedWarranties = filteredWarranties.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const pageStart = filteredWarranties.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredWarranties.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="z-10 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 lg:px-6 lg:py-5">
          <div className="max-w-full mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <ShieldCheck className="text-blue-600" size={28} />
                Warranty Database
              </h1>
              <p className="text-sm text-slate-500 font-medium">จัดการข้อมูลการรับประกันสินค้าและการซิงค์ RAG</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border-2 ${syncing
                    ? 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed'
                    : 'bg-white text-blue-600 border-blue-100 hover:border-blue-600 hover:bg-blue-50'
                  }`}
              >
                <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'กำลังซิงค์...' : 'ซิงค์กับ Qdrant'}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Plus size={20} />
                เพิ่มข้อมูลใหม่
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          <div className="max-w-full mx-auto space-y-6">

            {/* Stats & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
                  <p className="text-2xl font-black text-slate-800">{warranties.length}</p>
                </div>
                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Synced to RAG</p>
                  <p className="text-2xl font-black text-emerald-600">
                    {warranties.filter(w => w.qdrant_synced).length}
                  </p>
                </div>
              </div>

              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="ค้นหาตามชื่อ, เบอร์ หรือเลขทะเบียน..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Registration No</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sync Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <RefreshCw className="animate-spin text-blue-600 mx-auto mb-3" size={32} />
                        <p className="text-slate-400 font-medium">กำลังโหลดข้อมูล...</p>
                      </td>
                    </tr>
                  ) : filteredWarranties.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Package className="text-slate-200 mx-auto mb-3" size={48} />
                        <p className="text-slate-400 font-bold">ไม่พบข้อมูลการรับประกัน</p>
                      </td>
                    </tr>
                  ) : paginatedWarranties.map((w) => (
                    <tr key={w.registration_no} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <span className="font-bold text-slate-800 block">{w.registration_no}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block">Order: {w.order_number || '-'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <User size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-sm">{w.customer_name}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Phone size={10} /> {w.customer_phone}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-slate-700 block">{w.brand}</span>
                        <span className="text-xs text-slate-500">{w.category} {w.size ? `(${w.size})` : ''}</span>
                      </td>
                      <td className="px-6 py-5">
                        {w.qdrant_synced ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-full border border-emerald-100">
                            <CheckCircle2 size={12} /> Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-full border border-amber-100">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm">
                          <ExternalLink size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && filteredWarranties.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-slate-500">
                    แสดง {pageStart}-{pageEnd} จาก {filteredWarranties.length} รายการ
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                      disabled={currentPage === 1}
                      className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all ${currentPage === 1
                          ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600'
                        }`}
                    >
                      ก่อนหน้า
                    </button>
                    <div className="min-w-[84px] text-center text-sm font-bold text-slate-600">
                      หน้า {currentPage}/{totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all ${currentPage === totalPages
                          ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600'
                        }`}
                    >
                      หน้าถัดไป
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 font-sans">
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Plus className="text-blue-600" /> เพิ่มข้อมูลการรับประกัน
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-slate-200"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Registration No */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">เลขทะเบียนรับประกัน</label>
                    <input
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.registration_no}
                      onChange={e => setFormData({ ...formData, registration_no: e.target.value })}
                    />
                  </div>
                  {/* Order Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">เลขที่ใบสั่งซื้อ</label>
                    <input
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.order_number}
                      onChange={e => setFormData({ ...formData, order_number: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-slate-100 my-2 pt-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[2px] mb-4">ข้อมูลลูกค้า</p>
                  </div>

                  {/* Customer Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">ชื่อลูกค้า</label>
                    <input
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.customer_name}
                      onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                    />
                  </div>
                  {/* Customer Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">เบอร์โทรศัพท์</label>
                    <input
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.customer_phone}
                      onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-slate-100 my-2 pt-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[2px] mb-4">ข้อมูลสินค้า</p>
                  </div>

                  {/* Brand */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">แบรนด์</label>
                    <input
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.brand}
                      onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">ประเภทสินค้า</label>
                    <input
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  {/* Serial */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Serial Number</label>
                    <input
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.serial_no}
                      onChange={e => setFormData({ ...formData, serial_no: e.target.value })}
                    />
                  </div>
                  {/* Purchase Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">วันที่สั่งซื้อ</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.date_of_purchase}
                      onChange={e => setFormData({ ...formData, date_of_purchase: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    ยืนยันการเพิ่มข้อมูล
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
