'use client';

import Sidebar from '@/components/Sidebar';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Database,
  Hash,
  Layers,
  Loader2,
  Package,
  Phone,
  Plus,
  RefreshCw,
  SearchIcon,
  Shield,
  ShoppingCart,
  User,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { logClientActivity } from '@/lib/activity-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ITEMS_PER_PAGE = 10;
const MANUAL_WARRANTY_SYNC_FILTER = {
  reference_field: 'customer_phone',
  source: 'manual',
  exclude_registration_prefixes: ['AUTO-'],
  exclude_order_prefixes: ['CALL-'],
  exclude_sources: ['audio', 'voice', 'analysis'],
};

interface WarrantyRecord {
  file_id?: string;
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
  warranty_source?: string;
  created_at?: string;
}

interface WarrantyFormData {
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
}

interface CustomerWarrantyRecord {
  file_id?: string;
  registration_no?: string;
  brand?: string;
  model?: string;
  size?: string;
  serial_no?: string;
  warranty_period?: string;
  purchase_date?: string;
  delivery_date?: string;
  date_of_delivery?: string;
  order_number?: string;
  status?: string;
  sale_channel?: string;
  customer_phone?: string;
  qdrant_synced?: boolean;
  warranty_source?: string;
}

interface CustomerDetailResponse {
  customer?: {
    customer_id?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    nickname?: string;
  };
  warranties?: CustomerWarrantyRecord[];
}

const createDefaultFormData = (): WarrantyFormData => ({
  registration_no: '',
  customer_name: '',
  customer_phone: '',
  brand: '',
  category: '',
  size: '',
  serial_no: '',
  warranty_period: '12 Months',
  date_of_purchase: '',
  date_of_delivery: '',
  purchase_channel: 'Manual',
  order_number: '',
  status: 'ACTIVE',
});

const normalizePhone = (value: string): string => String(value || '').replace(/\D/g, '');

const normalizeText = (value: unknown): string => String(value ?? '').trim();

const isActiveWarrantyRecord = (item: WarrantyRecord): boolean => {
  const normalizedStatus = normalizeText(item.status).toUpperCase();
  const normalizedRegistration = normalizeText(item.registration_no).toUpperCase();
  return normalizedStatus !== 'DELETED' && !normalizedRegistration.startsWith('DELETED-');
};

const isActiveCustomerWarrantyRecord = (item: CustomerWarrantyRecord): boolean => {
  const normalizedStatus = normalizeText(item.status).toUpperCase();
  const normalizedRegistration = normalizeText(item.registration_no).toUpperCase();
  return normalizedStatus !== 'DELETED' && !normalizedRegistration.startsWith('DELETED-');
};

const isVoiceAnalysisWarrantyRecord = (item: WarrantyRecord | CustomerWarrantyRecord): boolean => {
  const normalizedRegistration = normalizeText(item.registration_no).toUpperCase();
  const normalizedOrder = 'order_number' in item ? normalizeText(item.order_number).toUpperCase() : '';
  const normalizedSource = normalizeText(item.warranty_source).toLowerCase();

  return normalizedRegistration.startsWith('AUTO-') ||
    normalizedOrder.startsWith('CALL-') ||
    normalizedSource.includes('audio') ||
    normalizedSource.includes('voice') ||
    normalizedSource.includes('analysis');
};

const getProductLabel = (item: WarrantyRecord): string => {
  const values = [item.brand, item.category, item.size].map(normalizeText).filter(Boolean);
  return values.length ? values.join(' / ') : '-';
};

const formatDate = (value: string): string => {
  const text = normalizeText(value);
  if (!text) return '-';

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getCustomerIdFromPhone = (phone: string): string => `CUST-${normalizePhone(phone)}`;

const getCustomerDisplayName = (customer?: CustomerDetailResponse['customer']): string => {
  const fullName = [customer?.first_name, customer?.last_name].map(normalizeText).filter(Boolean).join(' ');
  return fullName || normalizeText(customer?.nickname) || normalizeText(customer?.phone);
};

const fetchCustomerDetailByPhone = async (phone: string): Promise<CustomerDetailResponse | null> => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  const res = await fetch(`${API_BASE}/api/v1/customers/${encodeURIComponent(getCustomerIdFromPhone(normalizedPhone))}`, {
    cache: 'no-store',
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Customer lookup failed: HTTP ${res.status}`);
  }

  return await res.json() as CustomerDetailResponse;
};

const findMatchingCustomerWarranty = (
  record: WarrantyRecord,
  customerDetail: CustomerDetailResponse | null
): CustomerWarrantyRecord | null => {
  const normalizedRegistration = normalizeText(record.registration_no).toUpperCase();
  if (!normalizedRegistration || !Array.isArray(customerDetail?.warranties)) return null;

  return customerDetail.warranties.find((item) =>
    isActiveCustomerWarrantyRecord(item) &&
    !isVoiceAnalysisWarrantyRecord(item) &&
    normalizeText(item.registration_no).toUpperCase() === normalizedRegistration
  ) || null;
};

const mergeWarrantyWithCustomerData = (
  record: WarrantyRecord,
  customerDetail: CustomerDetailResponse,
  customerWarranty: CustomerWarrantyRecord
): WarrantyRecord => ({
  ...record,
  file_id: normalizeText(customerWarranty.file_id) || record.file_id,
  customer_name: getCustomerDisplayName(customerDetail.customer) || record.customer_name,
  customer_phone: normalizePhone(customerDetail.customer?.phone || customerWarranty.customer_phone || record.customer_phone),
  brand: normalizeText(customerWarranty.brand) || record.brand,
  category: normalizeText(customerWarranty.model) || record.category,
  size: normalizeText(customerWarranty.size) || record.size,
  serial_no: normalizeText(customerWarranty.serial_no) || record.serial_no,
  warranty_period: normalizeText(customerWarranty.warranty_period) || record.warranty_period,
  date_of_purchase: normalizeText(customerWarranty.purchase_date) || record.date_of_purchase,
  date_of_delivery: normalizeText(customerWarranty.delivery_date || customerWarranty.date_of_delivery) || record.date_of_delivery,
  order_number: normalizeText(customerWarranty.order_number) || record.order_number,
  purchase_channel: normalizeText(customerWarranty.sale_channel) || record.purchase_channel,
  status: normalizeText(customerWarranty.status) || record.status,
  qdrant_synced: typeof customerWarranty.qdrant_synced === 'boolean' ? customerWarranty.qdrant_synced : record.qdrant_synced,
  warranty_source: normalizeText(customerWarranty.warranty_source) || record.warranty_source,
});

const fetchManualWarrantyRecords = async (): Promise<WarrantyRecord[]> => {
  const res = await fetch(`${API_BASE}/api/v1/warranty/list`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  const baseRecords: WarrantyRecord[] = Array.isArray(data?.warranties)
    ? data.warranties
      .filter(isActiveWarrantyRecord)
      .filter((item: WarrantyRecord) => !isVoiceAnalysisWarrantyRecord(item))
    : [];

  const customerDetails = new Map<string, CustomerDetailResponse | null>();
  await Promise.all(Array.from(new Set(baseRecords.map((record) => normalizePhone(record.customer_phone)).filter(Boolean))).map(async (phone) => {
    customerDetails.set(phone, await fetchCustomerDetailByPhone(phone));
  }));

  return baseRecords.flatMap((record) => {
    const customerDetail = customerDetails.get(normalizePhone(record.customer_phone)) || null;
    const customerWarranty = findMatchingCustomerWarranty(record, customerDetail);

    return customerDetail && customerWarranty
      ? [mergeWarrantyWithCustomerData(record, customerDetail, customerWarranty)]
      : [];
  });
};

const buildCustomerWarrantyPayload = (payload: WarrantyFormData) => ({
  registration_no: normalizeText(payload.registration_no),
  brand: normalizeText(payload.brand),
  model: normalizeText(payload.category) || normalizeText(payload.size) || normalizeText(payload.brand) || normalizeText(payload.registration_no),
  serial_no: normalizeText(payload.serial_no) || null,
  warranty_period: normalizeText(payload.warranty_period) || '12 Months',
  purchase_date: normalizeText(payload.date_of_purchase) || null,
  status: normalizeText(payload.status) || 'ACTIVE',
  sale_channel: normalizeText(payload.purchase_channel) || 'Manual',
  agent_id: 'N/A',
});

export default function WarrantyDatabasePage() {
  const router = useRouter();
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<WarrantyFormData>(createDefaultFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchWarranties = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      setWarranties(await fetchManualWarrantyRecords());
    } catch (error) {
      console.error('Failed to fetch warranties:', error);
      setNotice({ type: 'error', text: 'โหลดข้อมูลประกันจาก Backend ไม่สำเร็จ' });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const syncWarrantyToQdrant = async ({
    notify = true,
    records = warranties,
  }: {
    notify?: boolean;
    records?: WarrantyRecord[];
  } = {}) => {
    if (syncing) return false;

    if (records.length === 0) {
      if (notify) {
        setNotice({ type: 'success', text: 'ยังไม่มีข้อมูลประกันจริงที่ตรงกับหน้า Customer สำหรับซิงค์เข้า Qdrant' });
      }
      return true;
    }

    const allowedRegistrationNumbers = records
      .map((record) => normalizeText(record.registration_no).toUpperCase())
      .filter(Boolean);
    const allowedCustomerPhones = records
      .map((record) => normalizePhone(record.customer_phone))
      .filter(Boolean);

    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/warranty/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...MANUAL_WARRANTY_SYNC_FILTER,
          registration_numbers: allowedRegistrationNumbers,
          customer_phones: allowedCustomerPhones,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      await logClientActivity({
        action: 'WARRANTY_SYNC_TRIGGERED',
        target: 'warranty-database',
        routePath: '/warranty',
        metadata: {
          successCount: typeof data?.success === 'number' ? data.success : null,
          total: typeof data?.total === 'number' ? data.total : null,
          referenceField: 'customer_phone',
          source: 'warranty-page-manual-sync',
        },
      });

      if (notify) {
        setNotice({
          type: 'success',
          text: `ซิงค์ Qdrant สำเร็จ ${data?.success ?? 0}/${data?.total ?? 0} รายการ`,
        });
      }

      await fetchWarranties({ silent: true });
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      if (notify) {
        setNotice({ type: 'error', text: 'ซิงค์ Qdrant ไม่สำเร็จ กรุณาตรวจสอบ Backend' });
      }
      return false;
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    fetchManualWarrantyRecords()
      .then((nextWarranties) => {
        if (!cancelled) {
          setWarranties(nextWarranties);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to fetch warranties:', error);
          setNotice({ type: 'error', text: 'โหลดข้อมูลประกันจาก Backend ไม่สำเร็จ' });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialSearch = new URLSearchParams(window.location.search).get('search') || '';
    setSearchTerm(initialSearch);
  }, []);

  const filteredWarranties = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const phoneKeyword = normalizePhone(searchTerm);

    if (!keyword) return warranties;

    return warranties.filter((item) => {
      const values = [
        item.registration_no,
        item.customer_name,
        item.customer_phone,
        item.brand,
        item.category,
        item.size,
        item.serial_no,
        item.order_number,
        item.purchase_channel,
      ].map((value) => normalizeText(value).toLowerCase());

      return values.some((value) => value.includes(keyword)) ||
        (phoneKeyword ? normalizePhone(item.customer_phone).includes(phoneKeyword) : false);
    });
  }, [searchTerm, warranties]);

  const totalPages = Math.max(1, Math.ceil(filteredWarranties.length / ITEMS_PER_PAGE));
  const paginatedWarranties = filteredWarranties.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const pageStart = filteredWarranties.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredWarranties.length);
  const syncedCount = warranties.filter((item) => item.qdrant_synced).length;
  const pendingCount = warranties.length - syncedCount;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const closeModal = () => {
    if (saving) return;
    setShowAddModal(false);
    setFormError(null);
    setFormData(createDefaultFormData());
  };

  const updateForm = (field: keyof WarrantyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const openWarrantyDetail = (item: WarrantyRecord) => {
    const phone = normalizePhone(item.customer_phone);
    const fileId = normalizeText(item.file_id) || normalizeText(item.registration_no);
    if (!phone || !fileId) return;

    router.push(`/customers/${getCustomerIdFromPhone(phone)}/warranty/${encodeURIComponent(fileId)}`);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const normalizedPhone = normalizePhone(formData.customer_phone);

    if (!formData.registration_no.trim()) {
      setFormError('กรุณากรอกเลขทะเบียนรับประกัน');
      return;
    }

    if (!formData.customer_name.trim()) {
      setFormError('กรุณากรอกชื่อลูกค้า');
      return;
    }

    if (normalizedPhone.length < 9) {
      setFormError('กรุณากรอกเบอร์โทรให้ถูกต้อง เพราะระบบใช้เบอร์นี้เป็นตัวอ้างอิงข้อมูลประกัน');
      return;
    }

    setSaving(true);

    const payload: WarrantyFormData = {
      ...formData,
      customer_phone: normalizedPhone,
      status: formData.status || 'ACTIVE',
      purchase_channel: formData.purchase_channel || 'Manual',
    };

    try {
      const customerDetail = await fetchCustomerDetailByPhone(normalizedPhone);
      if (!customerDetail?.customer) {
        throw new Error(`ไม่พบข้อมูล Customer จริงของเบอร์ ${normalizedPhone} กรุณาตรวจสอบหน้า Customer ก่อนบันทึกประกัน`);
      }

      const res = await fetch(`${API_BASE}/api/v1/customers/${encodeURIComponent(getCustomerIdFromPhone(normalizedPhone))}/warranty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCustomerWarrantyPayload(payload)),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `บันทึกข้อมูลประกันไม่สำเร็จ: HTTP ${res.status}`);
      }

      await logClientActivity({
        action: 'WARRANTY_CREATED',
        target: payload.registration_no,
        routePath: '/warranty',
        metadata: {
          registrationNo: payload.registration_no,
          customerName: payload.customer_name,
          customerPhone: payload.customer_phone,
          brand: payload.brand,
          referenceField: 'customer_phone',
          source: 'warranty-page-manual-registration',
        },
      });

      setShowAddModal(false);
      setFormData(createDefaultFormData());

      const nextWarranties = await fetchManualWarrantyRecords();
      setWarranties(nextWarranties);
      const synced = await syncWarrantyToQdrant({ notify: false, records: nextWarranties });

      setNotice({
        type: synced ? 'success' : 'error',
        text: synced
          ? `ลงทะเบียนประกันแล้ว ข้อมูลตรงกับ Customer ${payload.customer_phone} และซิงค์เข้า Qdrant แล้ว`
          : `ลงทะเบียนประกันแล้ว แต่ซิงค์ Qdrant ไม่สำเร็จ กรุณากดซิงค์อีกครั้ง`,
      });
    } catch (error) {
      console.error('Add failed:', error);
      setFormError(error instanceof Error ? error.message : 'บันทึกข้อมูลประกันไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-full space-y-6 p-4 sm:p-5 lg:p-6">
          <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="relative">
              {/* Decorative Frame */}
              <div className="absolute left-0 top-1 bottom-[34px] w-px bg-gradient-to-b from-violet-400 to-transparent opacity-60"></div>
              {/* 4-Point Star top-left */}
              <svg className="absolute -left-[5.5px] top-0 w-3 h-3 text-violet-500 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C12 0 12 10.5 24 12C24 12 12 13.5 12 24C12 24 12 13.5 0 12C0 12 12 10.5 12 0Z" />
              </svg>
              {/* Dot and horizontal line bottom-left */}
              <div className="absolute left-0 bottom-8 w-1.5 h-1.5 rounded-full bg-violet-500 -ml-[2px] opacity-80"></div>
              <div className="absolute left-1.5 bottom-[34.5px] right-24 h-px bg-gradient-to-r from-violet-400 via-violet-200 to-transparent opacity-60"></div>
              
              {/* Right Decorative Graphics (Swirls) */}
              <svg className="absolute -right-4 top-0 w-32 h-24 text-violet-300 pointer-events-none opacity-40 mix-blend-multiply hidden sm:block" viewBox="0 0 200 100" fill="none" stroke="currentColor">
                <path d="M150,80 Q100,80 120,40 T180,20" strokeWidth="0.5" fill="none"/>
                <path d="M130,90 Q80,90 90,50 T160,10" strokeWidth="0.5" fill="none"/>
                <path d="M160,70 C130,50 180,30 190,50 C200,70 170,90 140,80" strokeWidth="0.5" fill="none"/>
                <path d="M140,65 C140,65 140,75 145,75 C145,75 140,75 140,85 C140,85 140,75 135,75 C135,75 140,75 140,65Z" fill="#7C3AED" stroke="none"/>
                <circle cx="160" cy="25" r="1.5" fill="currentColor"/>
                <circle cx="150" cy="15" r="1" fill="currentColor"/>
                <circle cx="185" cy="85" r="1.5" fill="currentColor"/>
              </svg>

              <div className="pl-6 pt-2 pb-6 relative z-10">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#7C3AED] leading-none">Warranty</h1>
                  <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#0F172A] leading-none">Database</h1>
                  <span 
                    className="text-[32px] sm:text-[38px] md:text-[44px] leading-none ml-1 sm:ml-1.5 relative top-1.5 sm:top-2" 
                    style={{ 
                      fontFamily: 'var(--font-great-vibes), cursive', 
                      background: 'linear-gradient(to right, #0F172A, #7C3AED, #A78BFA)', 
                      WebkitBackgroundClip: 'text', 
                      WebkitTextFillColor: 'transparent',
                      padding: '8px 12px 8px 0',
                      lineHeight: '1.2'
                    }}
                  >
                    Inventory
                  </span>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#7C3AED] uppercase">
                  <span>CENTRALIZED WARRANTY SYSTEM</span>
                  <span className="text-violet-200">|</span>
                  <span>{warranties.length} RECORDS MANAGED</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <button
                type="button"
                onClick={() => syncWarrantyToQdrant()}
                disabled={syncing}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-5 py-3 text-[13px] font-bold shadow-sm transition-all ${
                  syncing
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    : 'border-violet-100 bg-white text-violet-600 hover:border-violet-300 hover:bg-violet-50 hover:shadow-md'
                }`}
              >
                {syncing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} strokeWidth={2.5} />}
                {syncing ? 'กำลังซิงค์...' : 'ซิงค์ Qdrant'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setFormData(createDefaultFormData());
                  setShowAddModal(true);
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-[13px] font-bold text-white shadow-[0_2px_10px_-3px_rgba(124,58,237,0.3)] transition-all hover:bg-violet-700 hover:shadow-lg active:scale-[0.98]"
              >
                <Plus size={18} strokeWidth={3} />
                ลงทะเบียนประกัน
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
            {notice && (
              <div
                className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  notice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {notice.text}
              </div>
            )}

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 pr-7">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                    <Database className="h-5 w-5 text-slate-500" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manual Records</p>
                    <p className="mt-0.5 text-2xl font-black leading-none text-slate-900">{warranties.length}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 pr-7">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white">
                    <Layers className="h-5 w-5 text-emerald-600" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80">Synced to Qdrant</p>
                    <p className="mt-0.5 text-2xl font-black leading-none text-emerald-700">{syncedCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 pr-7">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white">
                    <Clock className="h-5 w-5 text-amber-600" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/80">Pending</p>
                    <p className="mt-0.5 text-2xl font-black leading-none text-amber-700">{pendingCount}</p>
                  </div>
                </div>
              </div>

              <div className="relative w-full md:w-80 lg:w-96">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} strokeWidth={2.5} />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยเบอร์, ชื่อ, ทะเบียน, Serial..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm font-medium shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">เบอร์อ้างอิง</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">ทะเบียนประกัน</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">ลูกค้า</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">สินค้า</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">วันซื้อ</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Qdrant</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <RefreshCw className="mx-auto mb-3 animate-spin text-blue-600" size={32} />
                        <p className="font-medium text-slate-400">กำลังโหลดข้อมูล...</p>
                      </td>
                    </tr>
                  ) : filteredWarranties.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <Package className="mx-auto mb-3 text-slate-200" size={48} />
                        <p className="font-bold text-slate-400">ไม่พบข้อมูลการรับประกัน</p>
                      </td>
                    </tr>
                  ) : paginatedWarranties.map((item) => (
                    <tr
                      key={`${item.registration_no}-${item.customer_phone}`}
                      onClick={() => openWarrantyDetail(item)}
                      className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-700">
                          <Phone size={14} />
                          {item.customer_phone || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="block font-bold text-slate-800">{item.registration_no || '-'}</span>
                        <span className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400">
                          <Hash size={11} />
                          {item.serial_no || item.order_number || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            <User size={14} />
                          </div>
                          <div>
                            <span className="block whitespace-nowrap text-sm font-bold text-slate-800">{item.customer_name || '-'}</span>
                            <span className="mt-0.5 block text-xs font-medium text-slate-400">อ้างอิงจากเบอร์โทร</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="block text-sm font-bold text-slate-700">{getProductLabel(item)}</span>
                        <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <ShoppingCart size={12} />
                          {item.purchase_channel || 'Manual'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                          <CalendarDays size={14} className="text-slate-400" />
                          {formatDate(item.date_of_purchase)}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">{item.warranty_period || '-'}</span>
                      </td>
                      <td className="px-6 py-5">
                        {item.qdrant_synced ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-600">
                            <CheckCircle2 size={12} /> Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase text-amber-600">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSearchTerm(item.customer_phone || '');
                          }}
                          className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          title="กรองรายการด้วยเบอร์นี้"
                        >
                          <SearchIcon size={14} className="shrink-0" />
                          กรองเบอร์
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && filteredWarranties.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">
                  แสดง {pageStart}-{pageEnd} จาก {filteredWarranties.length} รายการ
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                    disabled={currentPage === 1}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                      currentPage === 1
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
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                      currentPage === totalPages
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

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-black text-slate-800">
                    <Plus className="text-blue-600" />
                    ลงทะเบียนประกันเอง
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    เบอร์โทรคือข้อมูลอ้างอิงหลักสำหรับค้นประกันและตอบจาก Qdrant
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-red-500"
                  disabled={saving}
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="max-h-[calc(92vh-92px)] overflow-y-auto p-6">
                {formError && (
                  <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">เลขทะเบียนรับประกัน *</span>
                    <input
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="เช่น WR-0001"
                      value={formData.registration_no}
                      onChange={(event) => updateForm('registration_no', event.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">เบอร์โทรอ้างอิง *</span>
                    <input
                      required
                      inputMode="tel"
                      className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-2.5 font-bold text-blue-700 outline-none transition-all placeholder:font-medium placeholder:text-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="0812345678"
                      value={formData.customer_phone}
                      onChange={(event) => updateForm('customer_phone', event.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ชื่อลูกค้า *</span>
                    <input
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="ชื่อลูกค้า"
                      value={formData.customer_name}
                      onChange={(event) => updateForm('customer_name', event.target.value)}
                    />
                  </label>

                  <div className="md:col-span-2 border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[2px] text-blue-600">ข้อมูลสินค้า</p>
                  </div>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">แบรนด์</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Brand"
                      value={formData.brand}
                      onChange={(event) => updateForm('brand', event.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ประเภทสินค้า</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Category / Model"
                      value={formData.category}
                      onChange={(event) => updateForm('category', event.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ขนาด / รุ่น</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Size / Variant"
                      value={formData.size}
                      onChange={(event) => updateForm('size', event.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Serial Number</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Serial No."
                      value={formData.serial_no}
                      onChange={(event) => updateForm('serial_no', event.target.value)}
                    />
                  </label>

                  <div className="md:col-span-2 border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[2px] text-blue-600">ข้อมูลการรับประกัน</p>
                  </div>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ระยะประกัน</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="12 Months"
                      value={formData.warranty_period}
                      onChange={(event) => updateForm('warranty_period', event.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">สถานะ</span>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      value={formData.status}
                      onChange={(event) => updateForm('status', event.target.value)}
                    >
                      <option value="ACTIVE">อยู่ในประกัน</option>
                      <option value="EXPIRED">หมดประกัน</option>
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">วันที่ซื้อ</span>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      value={formData.date_of_purchase}
                      onChange={(event) => updateForm('date_of_purchase', event.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">วันที่ส่งสินค้า</span>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      value={formData.date_of_delivery}
                      onChange={(event) => updateForm('date_of_delivery', event.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">ช่องทางซื้อ</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Manual / Online / Store"
                      value={formData.purchase_channel}
                      onChange={(event) => updateForm('purchase_channel', event.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">เลขที่ใบสั่งซื้อ</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Order No."
                      value={formData.order_number}
                      onChange={(event) => updateForm('order_number', event.target.value)}
                    />
                  </label>
                </div>

                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-2xl px-5 py-3 font-bold text-slate-500 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    {saving ? 'กำลังบันทึก...' : 'บันทึกและซิงค์ Qdrant'}
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
