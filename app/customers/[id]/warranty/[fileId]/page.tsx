'use client';

import Sidebar from '@/components/Sidebar';
import {
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  FileAudio
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ประกาศ Types สำหรับข้อมูลจริงจาก AI
interface WarrantyDetail {
  file_id: string;
  customer_phone: string;
  
  // Real AI Analysis Data
  brand: string | null;
  product_category: string | null;
  intent: string | null;
  sentiment: string;
  sentiment_confidence: number;
  sentiment_reason: string | null;
  csat_score: number;
  csat_reason: string | null;
  qa_score: number;
  qa_grade: string;
  qa_reason: string | null;
  summary: string | null;
  keywords: string | null;
  action_items: string | null;
  full_transcript: string | null;
  
  // Audio metadata
  upload_date: string | null;
  duration: number;
  file_size: number;
  agent_id: string;
  sale_channel: string;
  
  // Analysis metadata
  ai_mode: string;
  model_version: string;
  created_at: string | null;
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
      try {
        const res = await fetch(`${API_BASE}/api/v1/customers/${customerId}/warranty/${fileId}`);
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
        <main className="flex-1 p-6 flex items-center justify-center">
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
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-3xl">✕</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่พบข้อมูลการรับประกัน</h2>
            <p className="text-slate-500 mb-4">{error || 'Warranty not found'}</p>
            <button 
              onClick={() => router.push(`/customers/${customerId}`)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              กลับไปหน้าลูกค้า
            </button>
          </div>
        </main>
      </div>
    );
  }

  const SectionTitle = ({ title }: { title: string }) => (
    <h3 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b-2 border-slate-100 uppercase tracking-wide">
      {title}
    </h3>
  );

  const InfoRow = ({ label, value, bg = false }: { label: string, value: React.ReactNode, bg?: boolean }) => {
    // ไม่แสดง row ถ้าไม่มีข้อมูล
    if (value === null || value === undefined || value === '' || value === 'N/A' || value === 'Unknown') {
      return null;
    }
    
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 py-3 px-4 ${bg ? 'bg-slate-50 rounded-lg' : ''}`}>
        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
        <div className="min-h-[20px] md:col-span-2 text-sm font-bold text-slate-800 break-words">{value}</div>
      </div>
    );
  };

  // Helper functions
  const getSentimentBadge = (sentiment: string) => {
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const sentimentBadge = getSentimentBadge(warranty.sentiment);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-sm">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        
        {/* Top Navbar / Breadcrumb */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push(`/customers/${customerId}`)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => router.push('/customers')}>Customers</span>
              <span>/</span>
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => router.push(`/customers/${customerId}`)}>{customer.phone}</span>
              <span>/</span>
              <span className="text-slate-800 font-bold">Analysis Detail</span>
            </div>
          </div>
          
          <div className="text-xs text-slate-400">
            {warranty.created_at && `Created On ${formatDate(warranty.created_at)}`}
          </div>
        </div>

        <div className="p-8 max-w-6xl mx-auto space-y-8">
          
          {/* Header & Actions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${sentimentBadge.cls}`}>
                <ShieldCheck size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  {warranty.brand || 'ข้อมูลการวิเคราะห์'}
                  {warranty.product_category && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                      {warranty.product_category}
                    </span>
                  )}
                  <span className={`px-3 py-1 ${sentimentBadge.cls} text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1`}>
                    <CheckCircle2 size={12} /> {sentimentBadge.label}
                  </span>
                </h1>
                <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                  <FileAudio size={14} className="text-blue-500"/> ถอดความจากไฟล์เสียง (AI Analysis): 
                  <span className="font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => router.push(`/files/${fileId}`)}>{fileId.slice(0, 20)}...</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
              <button 
                onClick={() => router.push(`/files/${fileId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold shadow-md shadow-blue-200 transition-colors"
              >
                <FileAudio size={16} /> ดูไฟล์เสียง
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* AI Analysis Information */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
              <SectionTitle title="AI Analysis Results" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                <div className="space-y-1">
                  <InfoRow label="Brand" value={warranty.brand} bg />
                  <InfoRow label="Product Category" value={warranty.product_category} />
                  <InfoRow label="Intent" value={warranty.intent} bg />
                  <InfoRow label="Sentiment" value={`${warranty.sentiment} (${(warranty.sentiment_confidence * 100).toFixed(1)}%)`} />
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
                </div>
              </div>
            </div>

            {/* Summary */}
            {warranty.summary && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                <SectionTitle title="Summary" />
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{warranty.summary}</p>
                </div>
              </div>
            )}

            {/* Keywords */}
            {warranty.keywords && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <SectionTitle title="Keywords" />
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    try {
                      const keywords = JSON.parse(warranty.keywords);
                      return Array.isArray(keywords) ? keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                          {kw}
                        </span>
                      )) : <p className="text-slate-500 text-sm">No keywords</p>;
                    } catch {
                      return <p className="text-slate-500 text-sm">Invalid format</p>;
                    }
                  })()}
                </div>
              </div>
            )}

            {/* Action Items */}
            {warranty.action_items && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <SectionTitle title="Action Items" />
                <div className="space-y-2">
                  {(() => {
                    try {
                      const actions = JSON.parse(warranty.action_items);
                      return Array.isArray(actions) ? actions.map((action: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                          <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-700">{action}</span>
                        </div>
                      )) : <p className="text-slate-500 text-sm">No action items</p>;
                    } catch {
                      return <p className="text-slate-500 text-sm">Invalid format</p>;
                    }
                  })()}
                </div>
              </div>
            )}

            {/* Transcript */}
            {warranty.full_transcript && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                <SectionTitle title="Full Transcript" />
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 max-h-96 overflow-y-auto">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">{warranty.full_transcript}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
