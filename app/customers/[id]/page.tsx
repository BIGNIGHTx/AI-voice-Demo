'use client';

import Sidebar from '@/components/Sidebar';
import {
  CheckCircle2,
  History,
  Sparkles,
  Pencil,
  Plus,
  Filter,
  ListOrdered,
  ChevronRight,
  Zap,
  ChevronLeft,
  Package,
  ImagePlus
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const EMPTY_TEXT_VALUES = new Set(['', '-', 'n/a', 'none', 'null', 'unknown']);

interface WarrantyImage {
  image_id: string;
  original_filename: string;
  mime_type: string;
  url: string;
  created_at?: string | null;
}

interface CustomerDetail {
  customer_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  address: string;
  district: string;
  province: string;
  postcode: string;
  suggested_brand?: string;
  suggested_agent_id?: string;
  suggested_sale_channel?: string;
  nickname?: string;
}

interface CallHistoryItem {
  id: number;
  type: 'inbound' | 'outbound' | 'Unknown';
  date: string;
  time: string;
  file_id: string;
  agent_id?: string;
  title?: string;
}

interface WarrantyItem {
  file_id: string; // อ้างอิงถึงไฟล์เสียงการสนทนา
  registration_no: string;
  brand: string;
  model: string;
  serial_no: string;
  customer_phone?: string;
  agent_id?: string;
  warranty_period: string;
  purchase_date: string;
  status: string;
  sale_channel?: string;
  images?: WarrantyImage[];
  warranty_source?: string;
}

interface WarrantyFormState {
  registration_no: string;
  brand: string;
  model: string;
  serial_no: string;
  warranty_period: string;
  purchase_date: string;
  status: 'ACTIVE' | 'EXPIRED';
  sale_channel: string;
  agent_id: string;
}

const normalizeTextInput = (value?: string | null) => {
  const text = String(value ?? '').trim();
  return EMPTY_TEXT_VALUES.has(text.toLowerCase()) ? '' : text;
};

const normalizeDateForInput = (value?: string | null) => {
  const text = normalizeTextInput(value);
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const thaiDateMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (thaiDateMatch) {
    return `${thaiDateMatch[3]}-${thaiDateMatch[2]}-${thaiDateMatch[1]}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const getWarrantyExpiryDate = (purchaseDate?: string | null, period?: string | null) => {
  const normalizedPurchaseDate = normalizeDateForInput(purchaseDate);
  if (!normalizedPurchaseDate) return null;

  const date = new Date(normalizedPurchaseDate);
  if (Number.isNaN(date.getTime())) return null;

  const monthsMatch = String(period ?? '').match(/(\d+)/);
  const months = monthsMatch ? Number.parseInt(monthsMatch[1], 10) : 0;
  if (!months) return date;

  const expiryDate = new Date(date);
  expiryDate.setMonth(expiryDate.getMonth() + months);
  return expiryDate;
};

const resolveWarrantyStatus = (status?: string | null, purchaseDate?: string | null, period?: string | null) => {
  const rawStatus = String(status ?? '').trim().toUpperCase();
  const expiryDate = getWarrantyExpiryDate(purchaseDate, period);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (rawStatus === 'EXPIRED' || rawStatus === 'หมดอายุ') {
    return 'EXPIRED' as const;
  }

  if (expiryDate) {
    expiryDate.setHours(0, 0, 0, 0);
    if (expiryDate < today) {
      return 'EXPIRED' as const;
    }
  }

  if (['ACTIVE', 'PENDING', 'INFERRED', 'UNDER_WARRANTY', 'ACTIVE_WARRANTY'].includes(rawStatus)) {
    return 'ACTIVE' as const;
  }

  if (expiryDate) {
    return 'ACTIVE' as const;
  }

  return 'UNKNOWN' as const;
};

const getWarrantyStatusMeta = (status?: string | null, purchaseDate?: string | null, period?: string | null) => {
  const resolvedStatus = resolveWarrantyStatus(status, purchaseDate, period);

  if (resolvedStatus === 'ACTIVE') {
    return {
      value: 'ACTIVE' as const,
      label: 'อยู่ในประกัน',
      badgeClassName: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      panelClassName: 'border-emerald-200/80 bg-emerald-50/50',
      accentClassName: 'bg-emerald-500',
      iconClassName: 'bg-emerald-100 text-emerald-700',
      fieldClassName: 'border-emerald-300 bg-emerald-50 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-100',
    };
  }

  if (resolvedStatus === 'EXPIRED') {
    return {
      value: 'EXPIRED' as const,
      label: 'หมดอายุ',
      badgeClassName: 'bg-rose-50 text-rose-500 border border-rose-200',
      panelClassName: 'border-rose-200/80 bg-rose-50/40',
      accentClassName: 'bg-rose-400',
      iconClassName: 'bg-rose-100 text-rose-500',
      fieldClassName: 'border-rose-300 bg-rose-50 text-rose-600 focus:border-rose-500 focus:ring-rose-100',
    };
  }

  return {
    value: 'ACTIVE' as const,
    label: 'ไม่ระบุ',
    badgeClassName: 'bg-slate-200 text-slate-600 border border-slate-300',
    panelClassName: 'border-slate-200 bg-slate-50/80',
    accentClassName: 'bg-slate-400',
    iconClassName: 'bg-slate-200 text-slate-600',
    fieldClassName: 'border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-100',
  };
};

const getApiAssetUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddWarranty, setShowAddWarranty] = useState(false);
  const [savingWarranty, setSavingWarranty] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerDetail>>({});
  const [editingWarrantyFileId, setEditingWarrantyFileId] = useState<string | null>(null);
  const [selectedWarrantyImages, setSelectedWarrantyImages] = useState<File[]>([]);

  const buildDefaultWarrantyForm = useCallback((): WarrantyFormState => ({
    registration_no: '',
    brand: normalizeTextInput(customer?.suggested_brand) || '',
    model: '',
    serial_no: '',
    warranty_period: '12 Months',
    purchase_date: '',
    status: 'ACTIVE',
    sale_channel: normalizeTextInput(customer?.suggested_sale_channel) || 'Manual',
    agent_id: normalizeTextInput(customer?.suggested_agent_id) || 'N/A',
  }), [customer]);

  const [warrantyForm, setWarrantyForm] = useState<WarrantyFormState>(buildDefaultWarrantyForm);

  const loadCustomerDetails = useCallback(async () => {
    if (!customerId) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch customer: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setCustomer(data.customer);
      setWarranties(data.warranties || []);
      setCallHistory(data.call_history || []);
      if (!editingWarrantyFileId) {
        setWarrantyForm((prev) => ({
          ...prev,
          brand: normalizeTextInput(data?.customer?.suggested_brand) || '',
          agent_id: normalizeTextInput(data?.customer?.suggested_agent_id) || 'N/A',
          sale_channel: normalizeTextInput(data?.customer?.suggested_sale_channel) || 'Manual',
        }));
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching customer:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setCustomer(null);
      setWarranties([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, editingWarrantyFileId]);

  const resetWarrantyEditor = useCallback(() => {
    setEditingWarrantyFileId(null);
    setSelectedWarrantyImages([]);
    setWarrantyForm(buildDefaultWarrantyForm());
  }, [buildDefaultWarrantyForm]);

  const openCreateWarrantyModal = useCallback(() => {
    setError(null);
    resetWarrantyEditor();
    setShowAddWarranty(true);
  }, [resetWarrantyEditor]);

  const openEditWarrantyModal = useCallback((warranty: WarrantyItem) => {
    setError(null);
    setEditingWarrantyFileId(warranty.file_id);
    setSelectedWarrantyImages([]);
    setWarrantyForm({
      registration_no: normalizeTextInput(warranty.registration_no),
      brand: normalizeTextInput(warranty.brand),
      model: normalizeTextInput(warranty.model),
      serial_no: normalizeTextInput(warranty.serial_no),
      warranty_period: normalizeTextInput(warranty.warranty_period) || '12 Months',
      purchase_date: normalizeDateForInput(warranty.purchase_date),
      status: resolveWarrantyStatus(warranty.status, warranty.purchase_date, warranty.warranty_period) === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE',
      sale_channel: normalizeTextInput(warranty.sale_channel),
      agent_id: normalizeTextInput(warranty.agent_id) || 'N/A',
    });
    setShowAddWarranty(true);
  }, []);

  const closeWarrantyModal = useCallback(() => {
    setError(null);
    setShowAddWarranty(false);
    resetWarrantyEditor();
  }, [resetWarrantyEditor]);

  const handleWarrantyImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedWarrantyImages(files);
  };

  const uploadSelectedWarrantyImages = useCallback(async (warrantyFileId: string) => {
    if (!selectedWarrantyImages.length) {
      return;
    }

    for (const image of selectedWarrantyImages) {
      const formData = new FormData();
      formData.append('image', image);

      const res = await fetch(
        `${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}/warranty/${encodeURIComponent(warrantyFileId)}/images`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload image failed: ${res.status}`);
      }
    }
  }, [customerId, selectedWarrantyImages]);

  const handleSaveWarranty = async () => {
    setError(null);

    if (!warrantyForm.registration_no.trim() || !warrantyForm.model.trim()) {
      setError('กรุณากรอก Registration No. และ Model');
      return;
    }

    if (!warrantyForm.brand.trim()) {
      setError('ไม่พบ Brand จากผลวิเคราะห์ของลูกค้ารายนี้');
      return;
    }

    setSavingWarranty(true);
    try {
      const url = editingWarrantyFileId 
        ? `${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}/warranty/${encodeURIComponent(editingWarrantyFileId)}`
        : `${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}/warranty`;
      
      const res = await fetch(url, {
        method: editingWarrantyFileId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...warrantyForm,
          purchase_date: warrantyForm.purchase_date || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `${editingWarrantyFileId ? 'Update' : 'Create'} warranty failed: ${res.status}`);
      }

      const payload = await res.json();
      const savedWarrantyFileId = payload?.warranty?.file_id || editingWarrantyFileId;

      if (savedWarrantyFileId) {
        await uploadSelectedWarrantyImages(savedWarrantyFileId);
      }

      closeWarrantyModal();
      await loadCustomerDetails();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setSavingWarranty(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!customer) return;
    setSavingProfile(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}`, {
        method: 'PATCH', // Assuming PATCH or PUT
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update profile failed: ${res.status}`);
      }

      setIsEditing(false);
      await loadCustomerDetails();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    loadCustomerDetails();
  }, [loadCustomerDetails]);

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-5 lg:p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">กำลังโหลดข้อมูลลูกค้า...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-5 lg:p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-3xl">✕</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่พบข้อมูลลูกค้า</h2>
            <p className="text-slate-500 mb-4">{error || 'Customer not found'}</p>
            <button
              onClick={() => router.push('/customers')}
              className="cursor-pointer rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white transition-all hover:bg-blue-700"
            >
              กลับไปหน้ารายชื่อลูกค้า
            </button>
          </div>
        </main>
      </div>
    );
  }

  const formatDisplayDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateExpiryDate = (purchaseDate: string, period: string) => {
    const expiryDate = getWarrantyExpiryDate(purchaseDate, period);
    if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
      return '-';
    }
    return expiryDate.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim();
  const displayName = fullName || customer.nickname || customer.phone || customer.customer_id;
  const editingWarranty = warranties.find((item) => item.file_id === editingWarrantyFileId) || null;
  const warrantyFormStatusMeta = getWarrantyStatusMeta(
    warrantyForm.status,
    warrantyForm.purchase_date,
    warrantyForm.warranty_period
  );

  return (
    <div className="flex h-screen bg-[#f4f7f9] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6 font-sans text-slate-800">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/customers')}
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600"
            >
              <ChevronLeft size={18} />
              กลับไปหน้ารายชื่อลูกค้า
            </button>
          </div>

          {/* --- Header Profile --- */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 bg-rose-400 rounded-2xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                <div className="w-full h-full bg-red-400 flex items-end justify-center">
                   <div className="w-12 h-16 bg-slate-800 rounded-t-3xl opacity-50"></div>
                </div>
                <div className="absolute bottom-[-4px] right-[-4px] bg-blue-600 rounded-full p-1 border-2 border-white">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 tracking-wider mb-1">PRIVATE CLIENT</p>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">{displayName}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-medium">
                  <span className="bg-slate-200/50 px-2 py-1 rounded-md">ID: {customer.customer_id}</span>
                  <span className="flex items-center gap-1">📞 {customer.phone}</span>
                  {customer.nickname && <span className="flex items-center gap-1">@ {customer.nickname}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={openCreateWarrantyModal}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#4b5563] px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-slate-700 md:flex-none"
              >
                <Plus size={18} /> เพิ่มรายการใหม่
              </button>
            </div>
          </div>

          {/* --- Top Stats Row --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                  <CheckCircle2 size={24} />
                </div>
                <span className="text-xs font-bold text-slate-400 tracking-wider">WARRANTIES</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-800">{warranties.length}</div>
                <p className="text-xs text-slate-500 mt-1">รายการประกันสินค้าทั้งหมด</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-slate-100 text-slate-500 p-2 rounded-lg">
                  <History size={24} />
                </div>
                <span className="text-xs font-bold text-slate-400 tracking-wider">CALLS</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-800">{callHistory.length}</div>
                <p className="text-xs text-slate-500 mt-1">ประวัติการติดต่อศูนย์บริการ</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 md:col-span-2 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-rose-500" />
                <span className="text-xs font-bold text-slate-400 tracking-wider">AI RECOMMENDED STRATEGY</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {customer.suggested_brand ? `แนะนำแบรนด์ ${customer.suggested_brand} สำหรับกลุ่มลูกค้าระดับพรีเมียม` : 'ยังไม่มีคำแนะนำจากระบบ'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {customer.suggested_brand && <span className="px-3 py-1 bg-blue-100/50 text-blue-700 text-xs font-bold rounded-full">BRAND {customer.suggested_brand}</span>}
                {customer.suggested_agent_id && <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">AGENT {customer.suggested_agent_id}</span>}
                {customer.suggested_sale_channel && <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{customer.suggested_sale_channel}</span>}
              </div>
            </div>
          </div>

          {/* --- Main Content Grid --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left Column */}
            <div className="space-y-6">
              {/* Personal Info Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 text-lg">ข้อมูลส่วนตัว</h3>
                  {!isEditing ? (
                    <button 
                      onClick={() => {
                        setEditForm({
                          first_name: normalizeTextInput(customer.first_name),
                          last_name: normalizeTextInput(customer.last_name),
                          nickname: normalizeTextInput(customer.nickname),
                          phone: normalizeTextInput(customer.phone),
                          email: normalizeTextInput(customer.email),
                          gender: normalizeTextInput(customer.gender),
                          date_of_birth: normalizeDateForInput(customer.date_of_birth),
                          address: normalizeTextInput(customer.address),
                          district: normalizeTextInput(customer.district),
                          province: normalizeTextInput(customer.province),
                          postcode: normalizeTextInput(customer.postcode),
                        });
                        setIsEditing(true);
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <Pencil size={14} /> แก้ไขข้อมูล
                    </button>
                  ) : (
                    <div className="flex gap-2">
                       <button 
                        onClick={() => setIsEditing(false)}
                        className="cursor-pointer px-2 py-1 text-xs font-bold text-slate-400 hover:text-slate-600"
                        disabled={savingProfile}
                      >
                        ยกเลิก
                      </button>
                      <button 
                        onClick={handleSaveProfile}
                        className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                        disabled={savingProfile}
                      >
                        {savingProfile ? 'กำลังบันทึก...' : 'บันทึก'}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-1">FIRST NAME / ชื่อ</p>
                    {isEditing ? (
                      <input 
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent"
                        value={editForm.first_name || ''}
                        onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-800">{customer.first_name || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-1">LAST NAME / นามสกุล</p>
                    {isEditing ? (
                      <input 
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent"
                        value={editForm.last_name || ''}
                        onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-800">{customer.last_name || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-1">NICKNAME / ชื่อเล่น</p>
                    {isEditing ? (
                      <input 
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent"
                        value={editForm.nickname || ''}
                        onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-800">{customer.nickname || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-1">PHONE / เบอร์โทร</p>
                    {isEditing ? (
                      <input 
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-800">{customer.phone || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-1">GENDER / เพศ</p>
                    {isEditing ? (
                      <select 
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent"
                        value={editForm.gender || ''}
                        onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                      >
                        <option value="">โปรดเลือก</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="font-semibold text-slate-800">{customer.gender || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-1">BIRTHDAY / วันเกิด</p>
                    {isEditing ? (
                      <input 
                        type="date"
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent"
                        value={editForm.date_of_birth || ''}
                        onChange={(e) => setEditForm({...editForm, date_of_birth: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-800">{formatDisplayDate(customer.date_of_birth)}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">EMAIL / อีเมล</p>
                    {isEditing ? (
                      <input 
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-800 truncate">{customer.email || '-'}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">ADDRESS / ที่อยู่</p>
                    {isEditing ? (
                      <textarea 
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent resize-none"
                        rows={2}
                        value={editForm.address || ''}
                        onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed">{customer.address || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-1">DISTRICT / เขต-อำเภอ</p>
                    {isEditing ? (
                      <input 
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent"
                        value={editForm.district || ''}
                        onChange={(e) => setEditForm({...editForm, district: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-800">{customer.district || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-1">PROVINCE / จังหวัด</p>
                    {isEditing ? (
                      <input 
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent"
                        value={editForm.province || ''}
                        onChange={(e) => setEditForm({...editForm, province: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-800">{customer.province || '-'}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">POSTCODE / รหัสไปรษณีย์</p>
                    {isEditing ? (
                      <input 
                        className="w-full text-sm font-semibold text-slate-800 border-b border-blue-200 outline-none focus:border-blue-500 py-1 bg-transparent"
                        value={editForm.postcode || ''}
                        onChange={(e) => setEditForm({...editForm, postcode: e.target.value})}
                      />
                    ) : (
                      <p className="font-semibold text-slate-800">{customer.postcode || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Insights Summary Card */}
              <div className="bg-[#0052cc] text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={20} className="text-white" />
                  <h3 className="font-bold tracking-wider text-sm">INSIGHTS SUMMARY</h3>
                </div>
                <p className="text-sm leading-relaxed mb-6 text-blue-50">
                  {customer.suggested_brand 
                    ? `ลูกค้ารายนี้มีแนวโน้มที่จะอัพเกรดผลิตภัณฑ์ในกลุ่ม ${customer.suggested_brand} ภายในรอบระยะเวลาถัดไป โดยพิจารณาจากประวัติและพฤติกรรมการซื้อที่ระบบ AI วิเคราะห์ได้`
                    : 'ระบบกำลังวิเคราะห์ข้อมูลเชิงลึกสำหรับลูกค้ารายนี้ โปรดรอข้อมูลเพิ่มเติมหลังจากมีการติดต่อในอนาคต'}
                </p>
                <button className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wider transition hover:opacity-80">
                  VIEW DETAILED REPORT <ChevronRight size={14} />
                </button>
              </div>

              {/* Added Call History as a secondary section */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-slate-800 text-lg">ประวัติการติดต่อ</h3>
                   <span className="text-xs bg-slate-100 px-2 py-1 rounded-md font-bold text-slate-500">{callHistory.length}</span>
                </div>
                <div className="space-y-3">
                  {callHistory.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4 italic">ไม่พบประวัติการโทร</p>
                  ) : (
                    callHistory.slice(0, 5).map((call, idx) => (
                      <Link 
                        key={idx} 
                        href={`/files/${call.file_id}`}
                        className="block p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition drop-shadow-sm bg-white"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${call.type === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {(call.type || 'Unknown').toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{call.date}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 truncate">ID: {call.file_id}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Warranty List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-2 px-1">
                <h2 className="text-lg font-bold text-slate-800">รายการประกันสินค้า ({warranties.length})</h2>
                <div className="flex gap-4 text-slate-500">
                  <button className="cursor-pointer hover:text-slate-800"><Filter size={20} /></button>
                  <button className="cursor-pointer hover:text-slate-800"><ListOrdered size={20} /></button>
                </div>
              </div>

              {warranties.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
                  <Package size={48} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-500 font-medium">ยังไม่มีรายการประกันสินค้า</p>
                </div>
              ) : (
                warranties.map((warranty, index) => {
                  const statusMeta = getWarrantyStatusMeta(warranty.status, warranty.purchase_date, warranty.warranty_period);
                  const previewImage = getApiAssetUrl(warranty.images?.[0]?.url);

                  return (
                    <article
                      key={warranty.file_id || index}
                      onClick={() => router.push(`/customers/${customerId}/warranty/${warranty.file_id}`)}
                      className={`group flex cursor-pointer flex-col items-start gap-6 rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md md:flex-row ${statusMeta.panelClassName}`}
                    >
                      <div className="relative h-32 w-full overflow-hidden rounded-xl bg-slate-100 md:w-48 flex-shrink-0">
                        {previewImage ? (
                          <img
                            src={previewImage}
                            alt={warranty.model || warranty.registration_no}
                            className="h-full w-full object-cover"
                          />
                        ) : index % 2 === 0 ? (
                          <>
                            <div className="absolute bottom-0 h-1/2 w-full rounded-t-sm bg-slate-500"></div>
                            <div className="absolute bottom-1/2 h-4 w-full bg-white"></div>
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="h-24 w-24 rotate-45 transform rounded-md bg-slate-300 shadow-sm scale-y-75"></div>
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${statusMeta.badgeClassName}`}>
                            {statusMeta.label}
                          </span>
                          {warranty.images?.length ? (
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
                              {warranty.images.length} รูป
                            </span>
                          ) : null}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/5">
                          <ChevronRight className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </div>

                      <div className="relative w-full flex-1">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">{warranty.brand} - {warranty.model}</h3>
                            <p className="mt-1 text-xs font-medium text-slate-400">ทะเบียน: {warranty.registration_no || '-'}</p>
                          </div>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditWarrantyModal(warranty);
                            }}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                        </div>

                        <div className="mb-6 flex flex-wrap items-center gap-3">
                          <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{warranty.serial_no || warranty.registration_no || '-'}</span>
                          <span className="text-[11px] text-slate-400">• File ID: #{warranty.file_id}</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <ImagePlus size={13} className="text-slate-400" />
                            {warranty.images?.length ? 'แก้ไข/เพิ่มรูปได้' : 'เพิ่มรูปได้'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                          <div>
                            <p className="mb-1 text-[9px] font-bold uppercase text-slate-400">Purchase Date</p>
                            <p className="text-sm font-bold text-slate-800">{formatDisplayDate(warranty.purchase_date)}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-[9px] font-bold uppercase text-slate-400">Warranty</p>
                            <p className="text-sm font-bold text-slate-800">{warranty.warranty_period || '-'}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-[9px] font-bold uppercase text-slate-400">Channel</p>
                            <p className="text-sm font-bold leading-tight text-slate-800">{warranty.sale_channel || '-'}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-[9px] font-bold uppercase text-slate-400">Agent ID</p>
                            <p className="text-sm font-bold text-slate-800">{warranty.agent_id || '-'}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-[9px] font-bold uppercase text-slate-400">Expiry</p>
                            <p className="text-sm font-bold text-slate-800">{calculateExpiryDate(warranty.purchase_date, warranty.warranty_period)}</p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}

              <div className="pt-4 text-center">
                <button className="cursor-pointer text-xs font-bold text-slate-500 tracking-widest transition uppercase hover:text-slate-800">
                  Load all {warranties.length} records
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>

      {showAddWarranty && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-[2rem] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-semibold text-slate-900">{editingWarrantyFileId ? 'แก้ไขข้อมูลประกัน' : 'เพิ่มข้อมูลประกัน'}</h3>
              <p className="text-sm text-slate-500">
                {editingWarrantyFileId ? `แก้ไขข้อมูลสำหรับ File ID: ${editingWarrantyFileId}` : 'กรอกข้อมูลเฉพาะรายการนี้ โดยระบบจะเติมข้อมูลที่วิเคราะห์ได้ให้อัตโนมัติ'}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Registration No. *</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Registration No.*"
                  value={warrantyForm.registration_no}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, registration_no: e.target.value })}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Brand</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Brand"
                  value={warrantyForm.brand}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, brand: e.target.value })}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Model *</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Model*"
                  value={warrantyForm.model}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, model: e.target.value })}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Serial No.</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Serial No."
                  value={warrantyForm.serial_no}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, serial_no: e.target.value })}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Warranty Period</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Warranty Period"
                  value={warrantyForm.warranty_period}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, warranty_period: e.target.value })}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Purchase Date</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={warrantyForm.purchase_date}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, purchase_date: e.target.value })}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition focus:ring-4 ${warrantyFormStatusMeta.fieldClassName}`}
                  value={warrantyForm.status}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, status: e.target.value as 'ACTIVE' | 'EXPIRED' })}
                >
                  <option value="ACTIVE">อยู่ในประกัน</option>
                  <option value="EXPIRED">หมดอายุ</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Sale Channel</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Sale Channel"
                  value={warrantyForm.sale_channel}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, sale_channel: e.target.value })}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Agent ID</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Agent ID"
                  value={warrantyForm.agent_id}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, agent_id: e.target.value })}
                />
              </label>

              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">รูปสินค้า / เอกสารประกัน</p>
                    <p className="text-xs text-slate-400">เพิ่มหรือแก้ไขรูปภายหลังได้ด้วยปุ่ม Edit บนการ์ด</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">
                    <ImagePlus size={16} /> Choose file
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleWarrantyImageSelection}
                    />
                  </label>
                </div>

                {editingWarranty?.images?.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {editingWarranty.images.map((image) => (
                      <div key={image.image_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <img
                          src={getApiAssetUrl(image.url)}
                          alt={image.original_filename || warrantyForm.model}
                          className="h-28 w-full object-cover"
                        />
                        <p className="truncate px-3 py-2 text-[11px] font-medium text-slate-500">{image.original_filename || 'Warranty image'}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ไฟล์ที่เลือกใหม่</p>
                  {selectedWarrantyImages.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedWarrantyImages.map((file) => (
                        <span key={`${file.name}-${file.size}`} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                          {file.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">ยังไม่ได้เลือกรูปใหม่</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={closeWarrantyModal}
                className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                disabled={savingWarranty}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveWarranty}
                className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                disabled={savingWarranty || !warrantyForm.brand.trim()}
              >
                {savingWarranty ? 'กำลังบันทึก...' : 'บันทึกประกัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
