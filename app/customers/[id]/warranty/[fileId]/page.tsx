'use client';

import Sidebar from '@/components/Sidebar';
import {
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  FileAudio,
  ImagePlus
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface WarrantyImage {
  image_id: string;
  original_filename: string;
  url: string;
}

// ประกาศ Types สำหรับข้อมูลจริงจาก AI
interface WarrantyDetail {
  file_id: string;
  customer_phone: string;
  
  // Real AI Analysis Data
  brand: string | null;
  product_category: string | null;
  intent: string | null;
  sentiment: string | null;
  sentiment_confidence: number | null;
  sentiment_reason: string | null;
  csat_score: number | null;
  csat_reason: string | null;
  qa_score: number | null;
  qa_grade: string | null;
  qa_reason: string | null;
  summary: string | null;
  keywords: string | null;
  action_items: string | null;
  full_transcript: string | null;
  
  // Audio metadata
  upload_date: string | null;
  duration: number | null;
  file_size: number | null;
  agent_id: string;
  sale_channel: string;
  
  // Analysis metadata
  ai_mode: string;
  model_version: string;
  created_at: string | null;
  registration_no?: string;
  size?: string;
  serial_no?: string;
  warranty_period?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  date_of_delivery?: string;
  order_number?: string;
  expiry_date_of_warranty?: string;
  registrationDate?: string;
  status?: string;
  warranty_source?: string;
  images?: WarrantyImage[];
}

interface CustomerInfo {
  customer_id: string;
  phone: string;
}

export default function WarrantyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const fileId = params.fileId as string;

  const [warranty, setWarranty] = useState<WarrantyDetail | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWarrantyDetail() {
      if (!customerId || !fileId) return;

      try {
        const res = await fetch(
          `${API_BASE}/api/v1/customers/${encodeURIComponent(customerId)}/warranty/${encodeURIComponent(fileId)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        setWarranty(data.warranty);
        setCustomer(data.customer);
        setError(null);
      } catch (err) {
        console.error('Error fetching warranty:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setWarranty(null);
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    }

    fetchWarrantyDetail();
  }, [fileId, customerId]);

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-5 lg:p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">กำลังโหลดข้อมูลการรับประกัน...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !warranty || !customer) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-5 lg:p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-3xl">✕</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่พบข้อมูลการรับประกัน</h2>
            <p className="text-slate-500 mb-4">{error || 'Warranty not found'}</p>
            <button 
              onClick={() => router.push(`/customers/${customerId}`)}
              className="cursor-pointer rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white transition-all hover:bg-blue-700"
            >
              กลับไปหน้าลูกค้า
            </button>
          </div>
        </main>
      </div>
    );
  }

  const SectionTitle = ({ title }: { title: string }) => (
    <h3 className="mb-4 border-b border-slate-100 pb-2 text-base font-semibold uppercase tracking-[0.18em] text-slate-800">
      {title}
    </h3>
  );

  const InfoRow = ({ label, value, bg = false }: { label: string, value: React.ReactNode, bg?: boolean }) => {
    // แสดง - ถ้าไม่มีข้อมูล
    const isMissing = value === null || value === undefined || value === '' || value === 'N/A' || value === 'Unknown';
    const displayValue = isMissing ? '-' : value;
    
    return (
      <div className={`grid grid-cols-1 gap-2 px-3 py-2.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4 ${bg ? 'rounded-xl bg-slate-50' : ''}`}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="min-h-[20px] text-sm font-semibold text-slate-800 break-words">{displayValue}</div>
      </div>
    );
  };

  // Helper functions
  const getSentimentBadge = (sentiment?: string | null) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return { cls: 'bg-emerald-100 text-emerald-700', label: 'พอใจ' };
      case 'negative': return { cls: 'bg-red-100 text-red-600', label: 'ไม่พอใจ' };
      default: return { cls: 'bg-slate-100 text-slate-600', label: 'กลาง' };
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleString('th-TH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatThaiBuddhistDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const text = String(dateStr).trim();
    const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashDate) {
      const day = slashDate[1].padStart(2, '0');
      const month = slashDate[2].padStart(2, '0');
      const year = Number(slashDate[3]);
      return `${day}/${month}/${year < 2400 ? year + 543 : year}`;
    }

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;

    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDuration = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return null;
    const mins = Math.floor(Number(seconds) / 60);
    const secs = Math.floor(Number(seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return null;
    const size = Number(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isManualWarranty = warranty.ai_mode?.toLowerCase() === 'manual' || warranty.warranty_source?.toLowerCase() === 'manual';
  const sentimentBadge = isManualWarranty
    ? { cls: 'bg-blue-100 text-blue-700', label: '' }
    : getSentimentBadge(warranty.sentiment);
  const getApiAssetUrl = (url?: string | null) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-sm">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        
        {/* Top Navbar / Breadcrumb */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button 
              onClick={() => router.push(`/customers/${customerId}`)}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => router.push('/customers')}>Customers</span>
              <span>/</span>
              <span className="truncate hover:text-blue-600 cursor-pointer" onClick={() => router.push(`/customers/${customerId}`)}>{customer.phone}</span>
              <span>/</span>
              <span className="truncate font-semibold text-slate-800">Analysis Detail</span>
            </div>
          </div>
          
          <div className="hidden text-[11px] text-slate-400 lg:block">
            {warranty.created_at && `Created On ${formatDate(warranty.created_at)}`}
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          
          {/* Header & Actions */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center sm:p-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${sentimentBadge.cls} sm:h-12 sm:w-12`}>
                <ShieldCheck size={24} />
              </div>
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
                  {warranty.brand || 'ข้อมูลการวิเคราะห์'}
                  {warranty.product_category && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                      {warranty.product_category}
                    </span>
                  )}
                  {!isManualWarranty && (
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${sentimentBadge.cls}`}>
                      <CheckCircle2 size={12} /> {sentimentBadge.label}
                    </span>
                  )}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <FileAudio size={14} className="text-blue-500" /> ถอดความจากไฟล์เสียง:
                  <span className="cursor-pointer font-semibold text-blue-600 hover:underline" onClick={() => router.push(`/files/${fileId}`)}>{fileId.slice(0, 18)}...</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4 md:border-t-0 md:pt-0">
              <button 
                onClick={() => router.push(`/files/${fileId}`)}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <FileAudio size={16} /> ดูไฟล์เสียง
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            
            {/* AI Analysis Information */}
            <div className="col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 sm:p-6">
              <SectionTitle title={isManualWarranty ? "Warranty Information" : "AI Analysis Results"} />
              
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                {isManualWarranty ? (
                  <>
                    <div className="space-y-1">
                      <InfoRow label="Brand" value={warranty.brand} bg />
                      <InfoRow label="Product Category" value={warranty.product_category} />
                      <InfoRow label="Size" value={warranty.size} bg />
                      <InfoRow label="Registration No." value={warranty.registration_no} bg />
                      <InfoRow label="Serial No." value={warranty.serial_no} />
                      <InfoRow label="Warranty Period" value={warranty.warranty_period} bg />
                    </div>
                    <div className="space-y-1">
                      <InfoRow label="Customer Phone" value={warranty.customer_phone} bg />
                      <InfoRow label="Sale Channel" value={warranty.sale_channel} bg />
                      <InfoRow label="Order Number" value={warranty.order_number} />
                      <InfoRow label="Status" value={warranty.status} />
                      <InfoRow label="Registration Date" value={formatThaiBuddhistDate(warranty.registrationDate)} bg />
                      <InfoRow label="Delivery Date" value={formatThaiBuddhistDate(warranty.date_of_delivery)} />
                      <InfoRow label="Expiry Date" value={formatThaiBuddhistDate(warranty.expiry_date_of_warranty)} bg />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <InfoRow label="Brand" value={warranty.brand} bg />
                      <InfoRow label="Product Category" value={warranty.product_category} />
                      <InfoRow label="Customer Phone" value={warranty.customer_phone} bg />
                      <InfoRow label="Intent" value={warranty.intent} bg />
                      <InfoRow label="Sentiment" value={`${warranty.sentiment} (${((warranty.sentiment_confidence ?? 0) * 100).toFixed(1)}%)`} />
                      <InfoRow label="Sentiment Reason" value={warranty.sentiment_reason} bg />
                      <InfoRow label="CSAT Score" value={`${warranty.csat_score}/5`} />
                      <InfoRow label="CSAT Reason" value={warranty.csat_reason} bg />
                    </div>
                    <div className="space-y-1">
                      <InfoRow label="QA Score" value={`${warranty.qa_score}/10 (Grade: ${warranty.qa_grade})`} />
                      <InfoRow label="QA Reason" value={warranty.qa_reason} bg />
                      <InfoRow label="AI Mode" value={warranty.ai_mode} />
                      <InfoRow label="Model Version" value={warranty.model_version} bg />
                      <InfoRow label="Upload Date" value={formatDate(warranty.upload_date)} />
                      <InfoRow label="Duration" value={formatDuration(warranty.duration)} bg />
                      <InfoRow label="File Size" value={formatFileSize(warranty.file_size)} />
                      <InfoRow label="Serial No." value={warranty.serial_no} bg />
                      <InfoRow label="Start Date" value={warranty.warranty_start_date} />
                      <InfoRow label="End Date" value={warranty.warranty_end_date} bg />
                      <InfoRow label="Expiry Date" value={warranty.expiry_date_of_warranty} />
                      <InfoRow label="Registration Date" value={warranty.registrationDate} bg />
                    </div>
                  </>
                )}
              </div>
            </div>

            {warranty.images && warranty.images.length > 0 && (
              <div className="col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 sm:p-6">
                <SectionTitle title="Warranty Images" />
                <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                  <ImagePlus size={16} className="text-blue-500" />
                  รูปที่อัปโหลดจากหน้า Customer Detail
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {warranty.images.map((image) => (
                    <div key={image.image_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <img
                        src={getApiAssetUrl(image.url)}
                        alt={image.original_filename || 'Warranty image'}
                        className="h-48 w-full object-cover"
                      />
                      <p className="truncate px-4 py-3 text-sm font-medium text-slate-600">{image.original_filename || 'Warranty image'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}



          </div>
        </div>
      </main>
    </div>
  );
}
