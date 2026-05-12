'use client';

import Sidebar from '@/components/Sidebar';
import {
  AtSign,
  Cake,
  CalendarDays,
  ChevronLeft,
  History,
  ImagePlus,
  Mail,
  MapPin,
  MoreVertical,
  Package,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  VenusAndMars
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import Link from 'next/link';

import { logClientActivity } from '@/lib/activity-client';

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
  created_at?: string | null;
  createdAt?: string | null;
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
  size?: string;
  serial_no: string;
  customer_phone?: string;
  agent_id?: string;
  warranty_period: string;
  purchase_date: string;
  delivery_date?: string;
  date_of_delivery?: string;
  warranty_end_date?: string;
  expiry_date_of_warranty?: string;
  order_number?: string;
  status: string;
  sale_channel?: string;
  images?: WarrantyImage[];
  warranty_source?: string;
}

interface WarrantyFormState {
  registration_no: string;
  brand: string;
  model: string;
  size: string;
  serial_no: string;
  warranty_period: string;
  purchase_date: string;
  delivery_date: string;
  order_number: string;
  status: 'ACTIVE' | 'EXPIRED';
  sale_channel: string;
  agent_id: string;
}

const normalizeTextInput = (value?: string | null) => {
  const text = String(value ?? '').trim();
  return EMPTY_TEXT_VALUES.has(text.toLowerCase()) ? '' : text;
};

const normalizePhone = (value: unknown): string => String(value ?? '').replace(/\D/g, '');

const buildWarrantyKey = (registrationNo: unknown, phone: unknown): string =>
  `${normalizeTextInput(String(registrationNo ?? '')).toUpperCase()}::${normalizePhone(phone)}`;

const isActiveWarrantyRecord = (item: WarrantyItem): boolean => {
  const normalizedStatus = String(item.status || '').trim().toUpperCase();
  const normalizedRegistration = String(item.registration_no || '').trim().toUpperCase();
  return normalizedStatus !== 'DELETED' && !normalizedRegistration.startsWith('DELETED-');
};

const isVoiceAnalysisWarrantyRecord = (item: WarrantyItem): boolean => {
  const normalizedRegistration = String(item.registration_no || '').trim().toUpperCase();
  const normalizedOrder = String(item.order_number || '').trim().toUpperCase();
  const normalizedSerial = String(item.serial_no || '').trim().toUpperCase();
  const normalizedStatus = String(item.status || '').trim().toUpperCase();
  const normalizedSource = String(item.warranty_source || '').trim().toLowerCase();

  return normalizedStatus === 'INFERRED' ||
    normalizedRegistration.startsWith('AUTO-') ||
    normalizedOrder.startsWith('CALL-') ||
    normalizedSerial.startsWith('MOCK') ||
    normalizedSource.includes('audio') ||
    normalizedSource.includes('voice') ||
    normalizedSource.includes('analysis');
};

const isVisibleWarrantyRecord = (item: WarrantyItem): boolean =>
  isActiveWarrantyRecord(item) && !isVoiceAnalysisWarrantyRecord(item);

const fetchVisibleWarrantyKeys = async (): Promise<Set<string>> => {
  try {
    const res = await fetch(`${API_BASE}/api/v1/warranty/list`, { cache: 'no-store' });
    if (!res.ok) return new Set();

    const data = await res.json();
    const warranties = Array.isArray(data?.warranties) ? data.warranties : [];
    return new Set(
      warranties
        .filter((item: WarrantyItem) => isVisibleWarrantyRecord(item))
        .map((item: WarrantyItem) => buildWarrantyKey(item.registration_no, item.customer_phone))
        .filter((key: string) => !key.startsWith('::') && !key.endsWith('::'))
    );
  } catch {
    return new Set();
  }
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
  const [deletingWarrantyFileId, setDeletingWarrantyFileId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerDetail>>({});
  const [editingWarrantyFileId, setEditingWarrantyFileId] = useState<string | null>(null);
  const [selectedWarrantyImages, setSelectedWarrantyImages] = useState<File[]>([]);
  const [deletingWarrantyImageId, setDeletingWarrantyImageId] = useState<string | null>(null);

  const buildDefaultWarrantyForm = useCallback((): WarrantyFormState => ({
    registration_no: '',
    brand: normalizeTextInput(customer?.suggested_brand) || '',
    model: '',
    size: '',
    serial_no: '',
    warranty_period: '12 Months',
    purchase_date: '',
    delivery_date: '',
    order_number: '',
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

      const [data, visibleWarrantyKeys] = await Promise.all([
        res.json(),
        fetchVisibleWarrantyKeys(),
      ]);
      const customerPhone = normalizePhone(data?.customer?.phone) || normalizePhone(customerId);
      const visibleWarranties = (data.warranties || []).filter((item: WarrantyItem) =>
        isVisibleWarrantyRecord(item) &&
        visibleWarrantyKeys.has(buildWarrantyKey(item.registration_no, item.customer_phone || customerPhone))
      );

      setCustomer(data.customer);
      setWarranties(visibleWarranties);
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
      size: normalizeTextInput(warranty.size),
      serial_no: normalizeTextInput(warranty.serial_no),
      warranty_period: normalizeTextInput(warranty.warranty_period) || '12 Months',
      purchase_date: normalizeDateForInput(warranty.purchase_date),
      delivery_date: normalizeDateForInput(warranty.delivery_date || warranty.date_of_delivery),
      order_number: normalizeTextInput(warranty.order_number),
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

  const handleDeleteWarrantyImage = async (image: WarrantyImage) => {
    if (!editingWarrantyFileId || deletingWarrantyImageId) return;
    if (!window.confirm(`ต้องการลบรูป ${image.original_filename || 'นี้'} จริงหรือไม่?`)) return;

    setError(null);
    setDeletingWarrantyImageId(image.image_id);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}/warranty/${encodeURIComponent(editingWarrantyFileId)}/images/${encodeURIComponent(image.image_id)}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Delete image failed: ${res.status}`);
      }

      await loadCustomerDetails();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setDeletingWarrantyImageId(null);
    }
  };

  const handleSaveWarranty = async () => {
    setError(null);

    if (!warrantyForm.registration_no.trim() || !warrantyForm.model.trim()) {
      setError('กรุณากรอก Registration No. และ Model');
      return;
    }

    setSavingWarranty(true);
    try {
      const isEditingWarranty = Boolean(editingWarrantyFileId);
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

      // Trigger Qdrant sync so it appears in the main Warranty Database
      try {
        const currentPhone = normalizePhone(customer?.phone || customerId);
        await fetch(`${API_BASE}/api/v1/warranty/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference_field: 'customer_phone',
            source: 'manual',
            exclude_registration_prefixes: ['AUTO-'],
            exclude_order_prefixes: ['CALL-'],
            exclude_serial_prefixes: ['MOCK'],
            exclude_sources: ['audio', 'voice', 'analysis'],
            registration_numbers: [warrantyForm.registration_no],
            customer_phones: [currentPhone],
          }),
        });
      } catch (syncErr) {
        console.error('Failed to sync to Qdrant:', syncErr);
      }

      closeWarrantyModal();
      await loadCustomerDetails();

      await logClientActivity({
        action: isEditingWarranty ? 'WARRANTY_UPDATED' : 'WARRANTY_CREATED',
        target: savedWarrantyFileId || warrantyForm.registration_no,
        routePath: `/customers/${customerId}`,
        metadata: {
          customerId,
          registrationNo: warrantyForm.registration_no,
          brand: warrantyForm.brand,
          model: warrantyForm.model,
          imageCount: selectedWarrantyImages.length,
          source: isEditingWarranty ? 'customer-detail-edit' : 'customer-detail-create',
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setSavingWarranty(false);
    }
  };

  const handleDeleteWarranty = async (warranty: WarrantyItem) => {
    const warrantyLabel = warranty.registration_no || warranty.file_id;
    if (!window.confirm(`ต้องการลบรายการประกัน ${warrantyLabel} จริงหรือไม่?`)) {
      return;
    }

    setError(null);
    setDeletingWarrantyFileId(warranty.file_id);

    try {
      if (warranty.warranty_source === 'manual') {
        const deletedRegistrationNo = `DELETED-${warranty.file_id.slice(0, 8).toUpperCase()}`;
        const res = await fetch(
          `${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}/warranty/${encodeURIComponent(warranty.file_id)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              registration_no: deletedRegistrationNo,
              brand: warranty.brand,
              model: warranty.model,
              size: warranty.size || null,
              serial_no: null,
              warranty_period: warranty.warranty_period || null,
              purchase_date: normalizeDateForInput(warranty.purchase_date) || null,
              delivery_date: normalizeDateForInput(warranty.delivery_date || warranty.date_of_delivery) || null,
              order_number: warranty.order_number || null,
              status: 'DELETED',
              sale_channel: warranty.sale_channel || 'Manual',
              agent_id: warranty.agent_id || 'N/A',
            }),
          });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Delete warranty failed: ${res.status}`);
        }

        await loadCustomerDetails();

        await logClientActivity({
          action: 'WARRANTY_DELETED',
          target: warranty.file_id,
          routePath: `/customers/${customerId}`,
          metadata: {
            customerId,
            registrationNo: warranty.registration_no,
            warrantySource: warranty.warranty_source,
            source: 'customer-detail-manual-delete',
          },
        });

        return;
      }

      const deleteTargets = [
        `${API_BASE}/api/v1/audio/delete/${encodeURIComponent(warranty.file_id)}`,
        `${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}/warranty/${encodeURIComponent(warranty.file_id)}`,
      ];

      let deleted = false;
      let lastErrorMessage = '';

      for (const target of deleteTargets) {
        const res = await fetch(target, {
          method: 'DELETE',
        });

        if (res.ok) {
          deleted = true;
          break;
        }

        const text = await res.text();
        lastErrorMessage = text || `Delete warranty failed: ${res.status}`;

        if (res.status !== 404 && res.status !== 405) {
          throw new Error(lastErrorMessage);
        }
      }

      if (!deleted) {
        throw new Error(lastErrorMessage || 'Delete warranty failed');
      }

      await loadCustomerDetails();

      await logClientActivity({
        action: 'WARRANTY_DELETED',
        target: warranty.file_id,
        routePath: `/customers/${customerId}`,
        metadata: {
          customerId,
          registrationNo: warranty.registration_no,
          warrantySource: warranty.warranty_source,
          source: 'customer-detail-delete',
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      window.alert(errorMsg);
    } finally {
      setDeletingWarrantyFileId(null);
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

      await logClientActivity({
        action: 'CUSTOMER_PROFILE_UPDATED',
        target: customerId,
        routePath: `/customers/${customerId}`,
        metadata: {
          customerName: `${editForm.first_name} ${editForm.last_name}`.trim(),
          phone: editForm.phone,
          email: editForm.email,
          source: 'customer-detail-profile-edit',
        },
      });
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
      month: 'long',
      day: 'numeric',
    });
  };

  const formatWarrantyDisplayDate = (value?: string | null) => {
    const normalized = normalizeDateForInput(value);
    if (!normalized) return '-';

    const date = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value || '-';

    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getWarrantyDeliveryDate = (warranty: WarrantyItem) =>
    normalizeTextInput(warranty.delivery_date || warranty.date_of_delivery) || normalizeTextInput(warranty.purchase_date);

  const getWarrantyExpiryDisplayDate = (warranty: WarrantyItem, baseDate: string) => {
    const explicitExpiry = normalizeTextInput(warranty.expiry_date_of_warranty || warranty.warranty_end_date);
    if (explicitExpiry) return formatWarrantyDisplayDate(explicitExpiry);

    return calculateExpiryDate(baseDate, warranty.warranty_period);
  };

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim();
  const displayName = fullName || customer.nickname || customer.phone || customer.customer_id;
  const customerCreatedAt = normalizeTextInput(customer.created_at || customer.createdAt);
  const memberSinceDisplay = customerCreatedAt ? formatDisplayDate(customerCreatedAt) : '-';
  const addressLines = [
    normalizeTextInput(customer.address),
    [normalizeTextInput(customer.district), normalizeTextInput(customer.province)].filter(Boolean).join(' '),
    normalizeTextInput(customer.postcode),
  ].filter(Boolean);
  const shortAddress = addressLines.length ? addressLines.join(' ') : '-';
  const editingWarranty = warranties.find((item) => item.file_id === editingWarrantyFileId) || null;
  const warrantyFormStatusMeta = getWarrantyStatusMeta(
    warrantyForm.status,
    warrantyForm.purchase_date,
    warrantyForm.warranty_period
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7f9]">
      <Sidebar />
      <main className="relative flex-1 overflow-auto font-sans text-slate-800">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
          <div className="absolute -right-10 top-0 h-56 w-[720px] rounded-bl-full border-b border-teal-100/70" />
          <div className="absolute right-16 top-0 h-44 w-[560px] rounded-bl-full border-b border-teal-100/60" />
          <div className="absolute right-60 top-0 h-32 w-[380px] rounded-bl-full border-b border-teal-100/50" />
        </div>

        <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-5 lg:px-8 lg:py-7">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.push('/customers')}
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-teal-600"
            >
              <ChevronLeft size={18} />
              กลับไปหน้ารายชื่อลูกค้า
            </button>

          </div>

          <section className="relative">
            <div className="absolute left-0 top-3 bottom-0 w-px bg-gradient-to-b from-teal-400 via-teal-200 to-transparent" />
            <svg className="absolute -left-[5.5px] top-2 h-3 w-3 text-teal-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C12 0 12 10.5 24 12C24 12 12 13.5 12 24C12 24 12 13.5 0 12C0 12 12 10.5 12 0Z" />
            </svg>
            <div className="absolute -left-[3px] bottom-2 h-1.5 w-1.5 rounded-full bg-teal-500" />
            <div className="pl-9">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h1 className="text-[24px] font-black leading-none tracking-tight text-[#0D9488] sm:text-[28px] md:text-[32px]">Customer</h1>
                <h1 className="text-[24px] font-black leading-none tracking-tight text-[#0F172A] sm:text-[28px] md:text-[32px]">Profile</h1>
                <span
                  className="relative top-1.5 ml-1 text-[32px] leading-none sm:top-2 sm:ml-1.5 sm:text-[38px] md:text-[44px]"
                  style={{
                    fontFamily: 'var(--font-great-vibes), cursive',
                    background: 'linear-gradient(to right, #0F172A, #0D9488, #2DD4BF)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    padding: '8px 12px 8px 0',
                    lineHeight: '1.2',
                  }}
                >
                  Detail
                </span>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#0D9488] sm:text-xs">
                <span>CLIENT INFORMATION</span>
                <span className="text-teal-200">|</span>
                <span>ID: {customer.customer_id}</span>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={openCreateWarrantyModal}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#4b5563] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 sm:w-auto"
            >
              <Plus size={18} />
              เพิ่มรายการใหม่
            </button>
          </div>

          <section className="grid gap-4 lg:grid-cols-[minmax(320px,1.35fr)_repeat(3,minmax(150px,0.62fr))]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-full items-center gap-7">
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-50 via-teal-50 to-emerald-50 text-teal-600">
                  <User size={70} strokeWidth={1.8} />
                </div>
                <div className="h-28 w-px shrink-0 bg-slate-200" />
                <div className="min-w-0">
                  <h2 className="truncate text-[34px] font-semibold leading-tight tracking-tight text-slate-900">{displayName}</h2>
                  <p className="mt-3 text-lg font-semibold text-slate-400">เบอร์โทรศัพท์</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                      <Phone size={24} strokeWidth={2.2} />
                    </span>
                    <p className="truncate text-[32px] font-semibold leading-none tracking-tight text-teal-600">{customer.phone || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex h-full flex-col justify-between gap-7">
                <div>
                  <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-600">
                    <ShieldCheck size={18} strokeWidth={1.9} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">WARRANTIES</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">{warranties.length}</p>
                  <p className="mt-1 text-xs text-slate-500">รายการประกันสินค้าทั้งหมด</p>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex h-full flex-col justify-between gap-7">
                <div>
                  <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600">
                    <Phone size={18} strokeWidth={1.9} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">CALLS</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800">{callHistory.length}</p>
                  <p className="mt-1 text-xs text-slate-500">ประวัติการติดต่อศูนย์บริการ</p>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex h-full flex-col justify-between gap-5">
                <div>
                  <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
                    <MapPin size={18} strokeWidth={1.9} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">ADDRESS</p>
                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-800">{shortAddress}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid items-start gap-5 lg:grid-cols-[430px_minmax(0,1fr)]">
            <div className="space-y-5">
            <div id="personal-info" className="rounded-[22px] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-800">ข้อมูลส่วนตัว</h3>
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
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                  >
                    <Pencil size={14} /> แก้ไขข้อมูล
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="cursor-pointer rounded-xl px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                      disabled={savingProfile}
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="cursor-pointer rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
                      disabled={savingProfile}
                    >
                      {savingProfile ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"><User size={13} className="text-teal-500" /> FIRST NAME / ชื่อ</p>
                  {isEditing ? (
                    <input className="w-full border-b border-teal-200 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500" value={editForm.first_name || ''} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{customer.first_name || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">LAST NAME / นามสกุล</p>
                  {isEditing ? (
                    <input className="w-full border-b border-teal-200 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500" value={editForm.last_name || ''} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{customer.last_name || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"><AtSign size={13} className="text-teal-500" /> NICKNAME / ชื่อเล่น</p>
                  {isEditing ? (
                    <input className="w-full border-b border-teal-200 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500" value={editForm.nickname || ''} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{customer.nickname || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">PHONE / เบอร์โทร</p>
                  {isEditing ? (
                    <input className="w-full border-b border-teal-200 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{customer.phone || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"><VenusAndMars size={13} className="text-teal-500" /> GENDER / เพศ</p>
                  {isEditing ? (
                    <select className="w-full border-b border-teal-200 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500" value={editForm.gender || ''} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                      <option value="">โปรดเลือก</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{customer.gender || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"><Cake size={13} className="text-teal-500" /> BIRTHDAY / วันเกิด</p>
                  {isEditing ? (
                    <input type="date" className="w-full border-b border-teal-200 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500" value={editForm.date_of_birth || ''} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{formatDisplayDate(customer.date_of_birth)}</p>
                  )}
                </div>
                <div className="col-span-2 space-y-2">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"><Mail size={13} className="text-teal-500" /> EMAIL / อีเมล</p>
                  {isEditing ? (
                    <input className="w-full border-b border-teal-200 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  ) : (
                    <p className="truncate text-sm font-semibold text-slate-800">{customer.email || '-'}</p>
                  )}
                </div>
                <div className="col-span-2 space-y-2">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"><MapPin size={13} className="text-teal-500" /> ADDRESS / ที่อยู่</p>
                  {isEditing ? (
                    <textarea className="w-full resize-none border-b border-teal-200 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500" rows={2} value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                  ) : (
                    <p className="text-sm font-semibold leading-relaxed text-slate-800">{customer.address || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">DISTRICT / เขต-อำเภอ</p>
                  {isEditing ? (
                    <input className="w-full border-b border-teal-200 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500" value={editForm.district || ''} onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{customer.district || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">PROVINCE / จังหวัด</p>
                  {isEditing ? (
                    <input className="w-full border-b border-teal-200 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500" value={editForm.province || ''} onChange={(e) => setEditForm({ ...editForm, province: e.target.value })} />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{customer.province || '-'}</p>
                  )}
                </div>
                <div className="col-span-2 space-y-2">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"><CalendarDays size={13} className="text-teal-500" /> REGISTERED / ลงทะเบียนเมื่อ</p>
                  <p className="text-sm font-semibold text-slate-800">{memberSinceDisplay}</p>
                </div>
              </div>
            </div>

              <div className="rounded-[22px] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-slate-500" />
                    <h3 className="text-lg font-bold text-slate-800">ประวัติการติดต่อ</h3>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{callHistory.length}</span>
                </div>
                <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
                  {callHistory.length === 0 ? (
                    <p className="py-4 text-center text-sm italic text-slate-400">ไม่พบประวัติการโทร</p>
                  ) : (
                    callHistory.map((call, idx) => (
                      <Link
                        key={call.file_id || idx}
                        href={`/files/${call.file_id}`}
                        className="block rounded-xl border border-slate-50 bg-white p-3 shadow-sm transition hover:bg-slate-50"
                      >
                        <div className="mb-1 flex items-start justify-between">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${call.type === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {(call.type || 'Unknown').toUpperCase()}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">{call.date}</span>
                        </div>
                        <p className="truncate text-xs font-bold text-slate-700">ID: {call.file_id}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div id="warranty-list" className="space-y-4">
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-lg font-bold text-slate-800">รายการประกันสินค้า ({warranties.length})</h2>
              </div>

              {warranties.length === 0 ? (
                <div className="rounded-[22px] border border-slate-100 bg-white p-12 text-center shadow-sm">
                  <Package size={48} className="mx-auto mb-3 text-slate-200" />
                  <p className="font-bold text-slate-500">ยังไม่มีรายการประกันสินค้า</p>
                </div>
              ) : (
                warranties.map((warranty, index) => {
                  const warrantyDeliveryDate = getWarrantyDeliveryDate(warranty);
                  const statusMeta = getWarrantyStatusMeta(warranty.status, warrantyDeliveryDate, warranty.warranty_period);
                  const previewImage = getApiAssetUrl(warranty.images?.[0]?.url);
                  const expiryDate = getWarrantyExpiryDisplayDate(warranty, warrantyDeliveryDate);

                  return (
                    <article
                      key={warranty.file_id || index}
                      onClick={() => router.push(`/customers/${customerId}/warranty/${warranty.file_id}`)}
                      className="group relative flex cursor-pointer flex-col gap-5 rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:flex-row md:items-center"
                    >
                      <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-2xl bg-slate-100 md:h-32 md:w-36">
                        {previewImage ? (
                          <img src={previewImage} alt={warranty.model || warranty.registration_no} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                            <Package size={46} className="text-slate-300" />
                          </div>
                        )}
                        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold ${statusMeta.badgeClassName}`}>
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-slate-800">{warranty.brand} - {warranty.model}</h3>
                            <p className="mt-1 text-xs font-bold text-slate-400">ทะเบียน: {warranty.registration_no || '-'}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                              <span className="rounded-md bg-teal-50 px-2.5 py-1 text-teal-700">{warranty.serial_no || warranty.order_number || warranty.registration_no || '-'}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400">File ID: #{warranty.file_id}</span>
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <ImagePlus size={13} />
                                {warranty.images?.length ? 'แก้ไข/เพิ่มรูปได้' : 'เพิ่มรูปได้'}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditWarrantyModal(warranty);
                              }}
                              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600"
                              disabled={deletingWarrantyFileId === warranty.file_id}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteWarranty(warranty);
                              }}
                              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={deletingWarrantyFileId === warranty.file_id}
                            >
                              <Trash2 size={14} /> {deletingWarrantyFileId === warranty.file_id ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => event.stopPropagation()}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100"
                              title="More"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                          <div>
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Delivery Date</p>
                            <p className="text-sm font-bold text-slate-800">{formatWarrantyDisplayDate(warrantyDeliveryDate)}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Warranty</p>
                            <p className="text-sm font-bold text-slate-800">{warranty.warranty_period || '-'}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Channel</p>
                            <p className="text-sm font-bold text-slate-800">{warranty.sale_channel || '-'}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Agent ID</p>
                            <p className="text-sm font-bold text-slate-800">{warranty.agent_id || '-'}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Expiry</p>
                            <p className="text-sm font-bold text-slate-800">{expiryDate}</p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
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
                <span className="text-sm font-medium text-slate-700">Size / ขนาดรุ่น</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Size / Variant"
                  value={warrantyForm.size}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, size: e.target.value })}
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
                <span className="text-sm font-medium text-slate-700">Delivery Date / วันที่ส่ง</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={warrantyForm.delivery_date}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, delivery_date: e.target.value })}
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

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Order Number / เลขที่ใบสั่งซื้อ</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Order Number"
                  value={warrantyForm.order_number}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, order_number: e.target.value })}
                />
              </label>

              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">รูปสินค้า / เอกสารประกัน</p>
                    <p className="text-xs text-slate-400">ไม่ใส่รูปก็ได้ และเพิ่มหรือแก้ไขรูปภายหลังได้ด้วยปุ่ม Edit บนการ์ด</p>
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
                      <div key={image.image_id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleDeleteWarrantyImage(image)}
                          disabled={deletingWarrantyImageId === image.image_id}
                          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-rose-500 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          title="ลบรูปภาพ"
                        >
                          <Trash2 size={14} />
                        </button>
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
                disabled={savingWarranty}
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
