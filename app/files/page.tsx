'use client';

import Sidebar from '@/components/Sidebar';
import { Search, RotateCw, Calendar, Tag, CheckCircle2, RefreshCw, FileAudio, Package, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface FileRecord {
  file_id: string;
  name: string;
  customer: string;
  agent: string;
  agent_name: string;
  brand: string;
  product: string;
  sentiment: string;
  status: string;
  date: string;
  sale_channel: string;
}

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 10;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
      if (search) params.set('search', search);
      const res = await fetch(`${API_BASE}/api/v1/audio/list?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFiles(data.files || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับ API ได้ — กรุณาเปิด Backend Server');
      setFiles([]);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  };

  const getSentimentStyle = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'POSITIVE': return 'bg-emerald-50 text-emerald-600';
      case 'NEGATIVE': return 'bg-red-50 text-red-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-full mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
              <span className="text-blue-600"><FileAudio size={24} /></span> Files
            </h1>
          </div>

          {/* Toolbar */}
          <div className="bg-white p-4 rounded-t-2xl flex items-center space-x-4 shadow-sm border-b border-slate-100">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Search files, customers, brands, agents..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchFiles(); }}
              />
            </div>
            <button onClick={fetchFiles}
              className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors">
              <RotateCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 flex items-center space-x-4 shadow-sm">
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium flex items-center space-x-2 text-slate-600 cursor-pointer hover:bg-slate-50">
              <span>Date</span><Calendar size={16} />
            </button>
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium flex items-center space-x-2 text-slate-600 cursor-pointer hover:bg-slate-50">
              <span>Brand</span><Tag size={16} />
            </button>
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium flex items-center space-x-2 text-slate-600 cursor-pointer hover:bg-slate-50">
              <span>Product</span><Package size={16} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 m-4 flex items-start space-x-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
                <p className="text-xs text-red-600 mt-1">ตรวจสอบว่ารัน: <code className="bg-red-100 px-1.5 py-0.5 rounded">uvicorn main:app --reload --port 8000</code></p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-b-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="p-4 pl-6">File Name</th>
                  <th className="p-4">Sentiment</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Agent</th>
                  <th className="p-4">Brand</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    <p className="text-sm">กำลังโหลดข้อมูล...</p>
                  </td></tr>
                ) : files.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400">
                    <FileAudio size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">ไม่พบไฟล์</p>
                    <p className="text-xs mt-1">ลอง upload ไฟล์ใหม่จากหน้า Upload</p>
                  </td></tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.file_id}
                      onClick={() => router.push(`/files/${file.file_id}`)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="p-4 pl-6 flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-50 rounded flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <FileAudio size={16} />
                        </div>
                        <span className="font-medium text-slate-800 text-sm truncate max-w-[200px]">{file.name}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${getSentimentStyle(file.sentiment)}`}>
                          {file.sentiment}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{file.customer}</td>
                      <td className="p-4 text-sm text-slate-600">{file.agent}</td>
                      <td className="p-4 text-sm font-medium text-slate-800 uppercase">{file.brand || '-'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center space-x-1 text-xs font-bold ${
                          file.status === 'COMPLETE' ? 'text-emerald-500' : 'text-orange-500'
                        }`}>
                          {file.status === 'COMPLETE'
                            ? <CheckCircle2 size={14} />
                            : <RefreshCw size={14} className="animate-spin" />}
                          <span>{file.status}</span>
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500 whitespace-nowrap">{formatDate(file.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
              <span>Showing <span className="font-bold text-slate-800">{files.length}</span> of {total} entries</span>
              <div className="flex space-x-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                  className="px-4 py-2 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors disabled:opacity-30">PREVIOUS</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium cursor-pointer transition-colors ${
                      p === page ? 'bg-blue-700 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
                    }`}>{p}</button>
                ))}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                  className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-30">NEXT</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
