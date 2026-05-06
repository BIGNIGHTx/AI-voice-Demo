'use client';

import Sidebar from '@/components/Sidebar';
import {
  Search,
  RotateCw,
  CheckCircle2,
  RefreshCw,
  FileAudio,
  AlertCircle,
  Filter,
  CloudUpload,
  Loader2,
  Trash2,
  Trash,
  ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';

import { logClientActivity } from '@/lib/activity-client';

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
  call_direction?: string;
  call_type?: string;
  calltype?: string;
  call_datetime?: string;
  upload_date?: string;
  server_file_id?: string;
  is_local_upload?: boolean;
  local_upload_error?: string;
}

interface LocalUpload {
  temp_id: string;
  server_file_id?: string;
  name: string;
  created_at: string;
  status: 'UPLOADING' | 'PROCESSING' | 'ERROR';
  error?: string;
}

interface FilterOptions {
  brands: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toArray = (payload: unknown, keys: string[]): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (isObject(payload)) {
    for (const key of keys) {
      const candidate = payload[key];
      if (Array.isArray(candidate)) return candidate;
    }
  }
  return [];
};

const toText = (value: unknown): string => (typeof value === 'string' ? value : '').trim();

const getFileRows = (payload: unknown): Record<string, unknown>[] => {
  if (!isObject(payload)) return [];
  const candidates = [payload.files, payload.items, payload.results, payload.data];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((row): row is Record<string, unknown> => isObject(row));
    }
  }
  return [];
};

const getFileId = (row: Record<string, unknown>): string => {
  const raw = row.file_id ?? row.audio_file_id ?? row.id;
  return typeof raw === 'string' ? raw : '';
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

const yieldToMain = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const UPLOAD_ACCEPT = '.mp3,.wav,.m4a,.aac,.ogg,.flac,.wma,.opus';

const buildFilesSignature = (items: FileRecord[], totalCount: number): string => (
  `${totalCount}::${items.map((file) => [
    file.file_id,
    file.name,
    file.status,
    file.sentiment,
    file.brand,
    file.date,
    file.upload_date || ''
  ].join('~')).join('|')}`
);

const toOptimisticFileRecord = (upload: LocalUpload): FileRecord => ({
  file_id: upload.temp_id,
  server_file_id: upload.server_file_id,
  name: upload.name,
  customer: '-',
  agent: '-',
  agent_name: '',
  brand: '-',
  product: '',
  sentiment: '-',
  status: upload.status,
  date: upload.created_at,
  sale_channel: '-',
  call_direction: 'Unknown',
  call_type: 'Unknown',
  calltype: 'unknown',
  call_datetime: upload.created_at,
  upload_date: upload.created_at,
  is_local_upload: true,
  local_upload_error: upload.error,
});

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [localUploads, setLocalUploads] = useState<LocalUpload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ brands: [] });
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [filters, setFilters] = useState({
    brand: '',
    sentiment: '',
    callType: '',
    dateFrom: '',
    dateTo: '',
    uploadDate: ''
  });

  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<FileRecord[]>([]);
  const latestFetchIdRef = useRef(0);
  const filesSignatureRef = useRef('');

  const perPage = 10;

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const commitServerFiles = useCallback((nextFiles: FileRecord[], nextTotal: number) => {
    const nextSignature = buildFilesSignature(nextFiles, nextTotal);

    if (filesSignatureRef.current !== nextSignature) {
      filesSignatureRef.current = nextSignature;
      setFiles(nextFiles);
    }

    setTotal((prev) => (prev === nextTotal ? prev : nextTotal));
  }, []);

  const resetServerFiles = useCallback((nextFiles: FileRecord[], nextTotal: number) => {
    filesSignatureRef.current = buildFilesSignature(nextFiles, nextTotal);
    setFiles(nextFiles);
    setTotal(nextTotal);
  }, []);

  const getUploadErrorMessage = useCallback(async (response: Response) => {
    try {
      const payload: unknown = await response.json();
      if (isObject(payload)) {
        const detail = toText(payload.detail);
        if (detail) return detail;

        const message = toText(payload.message);
        if (message) return message;
      }
    } catch {
      // ignore JSON parse failure and fall back to HTTP status
    }

    return `HTTP ${response.status}`;
  }, []);

  const fetchFiles = useCallback(async (silent = false) => {
    const fetchId = latestFetchIdRef.current + 1;
    latestFetchIdRef.current = fetchId;

    const isSilent = typeof silent === 'boolean' ? silent : false;
    const hasVisibleFiles = filesRef.current.length > 0;
    const shouldBlockTable = !isSilent && !hasVisibleFiles;

    if (shouldBlockTable) {
      setLoading(true);
    }

    setError(null);
    try {
      const perRequest = 200;
      const buildParams = (targetPage: number) => {
        const params = new URLSearchParams({ page: targetPage.toString(), per_page: perRequest.toString() });
        if (fileSearch) params.set('search', fileSearch);
        if (filters.brand) params.set('brand', filters.brand);
        return params;
      };

      const firstRes = await fetch(`${API_BASE}/api/v1/audio/list?${buildParams(1)}`, { cache: 'no-store' });
      if (!firstRes.ok) throw new Error(`HTTP ${firstRes.status}`);

      const firstData = await firstRes.json();
      const totalFromApi = Number(firstData.total || 0);
      const firstRows = getFileRows(firstData) as unknown as FileRecord[];
      const apiTotalPages = Math.max(1, Number(firstData.total_pages || 1));
      const collected: FileRecord[] = [...firstRows];

      if (shouldBlockTable && fetchId === latestFetchIdRef.current) {
        commitServerFiles(firstRows, totalFromApi || firstRows.length);
        setLoading(false);
      }

      if (apiTotalPages > 1) {
        const nextPages = Array.from({ length: apiTotalPages - 1 }, (_, index) => index + 2);
        const remainingResults = await Promise.all(
          nextPages.map(async (currentPage) => {
            const nextRes = await fetch(`${API_BASE}/api/v1/audio/list?${buildParams(currentPage)}`, { cache: 'no-store' });
            if (!nextRes.ok) throw new Error(`HTTP ${nextRes.status}`);
            const nextData = await nextRes.json();
            return getFileRows(nextData) as unknown as FileRecord[];
          })
        );

        for (const rows of remainingResults) {
          collected.push(...rows);
        }
      }

      if (fetchId !== latestFetchIdRef.current) {
        return;
      }

      commitServerFiles(collected, totalFromApi || collected.length);
    } catch {
      if (!isSilent) {
        setError('ไม่สามารถเชื่อมต่อกับ API ได้ — กรุณาเปิด Backend Server');
        if (!hasVisibleFiles) {
          resetServerFiles([], 0);
        }
      }
    } finally {
      if (shouldBlockTable && fetchId === latestFetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [commitServerFiles, fileSearch, filters.brand, resetServerFiles]);

  useEffect(() => {
    if (files.length === 0) return;

    const serverIds = new Set(files.map((file) => file.file_id));
    setLocalUploads((prev) => {
      const next = prev.filter((upload) => (
        !upload.server_file_id || !serverIds.has(upload.server_file_id)
      ));

      return next.length === prev.length ? prev : next;
    });
  }, [files]);

  const handleUploadButtonClick = () => {
    uploadInputRef.current?.click();
  };

  const startAutoAnalysis = useCallback(async (fileId: string) => {
    const response = await fetch('/api/background-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    });

    if (!response.ok) {
      throw new Error(await getUploadErrorMessage(response));
    }

    await response.json().catch(() => null);
  }, [getUploadErrorMessage]);

  const handleUploadSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';

    if (selectedFiles.length === 0) return;

    setPage(1);
    setError(null);

    const batchBase = Date.now();
    const uploads = selectedFiles.map((file, index) => ({
      temp_id: `local-upload-${batchBase}-${index}`,
      name: file.name,
      created_at: new Date(batchBase + index).toISOString(),
      status: 'UPLOADING' as const,
    }));

    setLocalUploads((prev) => [...uploads, ...prev]);

    for (let index = 0; index < selectedFiles.length; index += 1) {
      const selectedFile = selectedFiles[index];
      const upload = uploads[index];
      let serverFileId = '';

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch(`${API_BASE}/api/v1/audio/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(await getUploadErrorMessage(response));
        }

        const payload: unknown = await response.json().catch(() => null);
        serverFileId = isObject(payload) ? toText(payload.file_id) : '';

        if (!serverFileId) {
          throw new Error('อัปโหลดสำเร็จ แต่ไม่พบ file_id จากระบบ');
        }

        await logClientActivity({
          action: 'AUDIO_FILE_UPLOADED',
          target: serverFileId,
          routePath: '/files',
          metadata: {
            fileName: selectedFile.name,
            source: 'files-page-upload',
          },
        });

        setLocalUploads((prev) => prev.map((item) => (
          item.temp_id === upload.temp_id
            ? {
              ...item,
              status: 'PROCESSING',
              server_file_id: serverFileId || undefined,
              error: undefined,
            }
            : item
        )));

        void startAutoAnalysis(serverFileId)
          .then(async () => {
            await logClientActivity({
              action: 'AUDIO_ANALYSIS_REQUESTED',
              target: serverFileId,
              routePath: '/files',
              metadata: {
                fileName: selectedFile.name,
                source: 'files-page-auto-analysis',
              },
            });

            void fetchFiles(true);
          })
          .catch((analysisError: unknown) => {
            const baseMessage = analysisError instanceof Error ? analysisError.message : 'à¹€à¸£à¸´à¹ˆà¸¡à¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œà¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ';
            setError(`à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹à¸¥à¹‰à¸§ à¹à¸•à¹ˆà¹€à¸£à¸´à¹ˆà¸¡à¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œà¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ${baseMessage}`);
            setLocalUploads((prev) => prev.map((item) => (
              item.temp_id === upload.temp_id
                ? {
                  ...item,
                  status: 'ERROR',
                  server_file_id: serverFileId || item.server_file_id,
                  error: baseMessage,
                }
                : item
            )));
          });

        void fetchFiles(true);
      } catch (uploadError: unknown) {
        const baseMessage = uploadError instanceof Error ? uploadError.message : 'อัปโหลดไฟล์ไม่สำเร็จ';
        const message = serverFileId
          ? `อัปโหลดแล้ว แต่เริ่มวิเคราะห์อัตโนมัติไม่สำเร็จ: ${baseMessage}`
          : baseMessage;

        if (serverFileId) {
          setError(message);
        }

        setLocalUploads((prev) => prev.map((item) => (
          item.temp_id === upload.temp_id
            ? {
              ...item,
              status: 'ERROR',
              server_file_id: serverFileId || item.server_file_id,
              error: message,
            }
            : item
        )));
      }
    }

    void fetchFiles(true);
  };

  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('ต้องการลบไฟล์นี้จริงหรือไม่?')) return;

    setDeleting(fileId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/audio/delete/${fileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      await logClientActivity({
        action: 'AUDIO_FILE_DELETED',
        target: fileId,
        routePath: '/files',
        metadata: { source: 'files-page-single-delete' },
      });

      await fetchFiles();
    } catch {
      setError('ลบไฟล์ไม่สำเร็จ');
    } finally {
      setDeleting(null);
    }
  };

  const performDeleteAll = useCallback(async () => {
    setDeletingAll(true);
    setError(null);
    try {
      // Repeatedly fetch first page and delete until no files remain.
      let deletedCount = 0;
      let failedCount = 0;
      const failedStatuses: number[] = [];
      let safetyRounds = 0;
      const maxRounds = 200;

      while (safetyRounds < maxRounds) {
        safetyRounds += 1;

        const listRes = await fetch(`${API_BASE}/api/v1/audio/list?page=1&per_page=200`, { cache: 'no-store' });
        if (!listRes.ok) throw new Error('ไม่สามารถดึงรายการไฟล์เพื่อลบทั้งหมดได้');

        const listData = await listRes.json();
        const rows = getFileRows(listData);
        const ids = Array.from(new Set(rows.map(getFileId).filter(Boolean)));

        if (ids.length === 0) {
          break;
        }

        const batches = chunk(ids, 5);
        let deletedInRound = 0;

        for (const batch of batches) {
          const results = await Promise.allSettled(
            batch.map((id) => fetch(`${API_BASE}/api/v1/audio/delete/${id}`, { method: 'DELETE' }))
          );

          for (const result of results) {
            if (result.status === 'fulfilled' && result.value.ok) {
              deletedInRound += 1;
              deletedCount += 1;
            } else {
              failedCount += 1;
              if (result.status === 'fulfilled') {
                failedStatuses.push(result.value.status);
              }
            }
          }

          await yieldToMain();
        }

        if (deletedInRound === 0) {
          throw new Error('Delete API ไม่ตอบรับไฟล์ใดเลย');
        }

        await yieldToMain();
      }

      if (safetyRounds >= maxRounds) {
        throw new Error('ใช้เวลาลบนานเกินกำหนด กรุณาลองใหม่');
      }

      const verifyRes = await fetch(`${API_BASE}/api/v1/audio/list?page=1&per_page=10`, { cache: 'no-store' });
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        const remaining = getFileRows(verifyData).length;
        if (remaining === 0) {
          resetServerFiles([], 0);
          setTotalPages(1);
          setPage(1);
        }
      }

      await fetchFiles();

      if (deletedCount > 0) {
        await logClientActivity({
          action: 'AUDIO_FILES_BULK_DELETED',
          target: 'all-files',
          routePath: '/files',
          metadata: {
            deletedCount,
            failedCount,
            source: 'files-page-delete-all',
          },
        });
      }

      if (failedCount > 0) {
        const statusText = failedStatuses.length > 0
          ? ` (status: ${Array.from(new Set(failedStatuses)).slice(0, 3).join(', ')})`
          : '';
        setError(`ลบได้บางส่วน: ลบไม่สำเร็จ ${failedCount} ไฟล์${statusText}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ลบไฟล์ทั้งหมดไม่สำเร็จ';
      setError(message || 'ลบไฟล์ทั้งหมดไม่สำเร็จ');
    } finally {
      setDeletingAll(false);
    }
  }, [fetchFiles, resetServerFiles]);

  const handleDeleteAll = () => {
    if (!confirm(`ต้องการลบไฟล์ทั้งหมด ${total} ไฟล์จริงหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้!`)) return;

    // Defer heavy async workflow so the click handler can return immediately.
    setTimeout(() => {
      void performDeleteAll();
    }, 0);
  };

  useEffect(() => {
    fetchFiles();

    // Auto-refresh file list every 5 seconds
    const interval = setInterval(() => {
      fetchFiles(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchFiles]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      setLoadingFilters(true);
      try {
        const [brandRes, filesRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/v1/analytics/brand-intelligence`, { cache: 'no-store' }),
          fetch(`${API_BASE}/api/v1/audio/list?page=1&per_page=500`, { cache: 'no-store' })
        ]);

        const brands = new Set<string>();

        if (brandRes.status === 'fulfilled' && brandRes.value.ok) {
          const payload = await brandRes.value.json();
          const items = toArray(payload, ['brand_intelligence', 'brands', 'data', 'items']);
          for (const item of items) {
            if (!isObject(item)) continue;
            const brand = toText(item.brand_name ?? item.brand ?? item.name);
            if (brand) brands.add(brand.toUpperCase());
          }
        }

        if (filesRes.status === 'fulfilled' && filesRes.value.ok) {
          const payload = await filesRes.value.json();
          const items = toArray(payload, ['files', 'data', 'items', 'results']);
          for (const item of items) {
            if (!isObject(item)) continue;
            const brand = toText(item.brand);
            if (brand) brands.add(brand.toUpperCase());
          }
        }

        setFilterOptions({
          brands: Array.from(brands).sort((a, b) => a.localeCompare(b))
        });
      } catch {
        setFilterOptions({ brands: [] });
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilterOptions();
  }, []);

  const clearFilters = () => {
    setFilters({
      brand: '',
      sentiment: '',
      callType: '',
      dateFrom: '',
      dateTo: '',
      uploadDate: ''
    });
    setPage(1);
  };

  const getCallType = (file: FileRecord) => {
    const source = String(
      file.call_type || file.call_direction || file.calltype || file.sale_channel || file.name || ''
    ).toLowerCase();
    if (source.includes('inbound')) return 'inbound';
    if (source.includes('outbound')) return 'outbound';
    return 'unknown';
  };

  const getFileDateKey = (file: FileRecord) => {
    const raw = String(file.call_datetime || file.date || '').trim();
    if (!raw) return '';
    return raw.slice(0, 10);
  };

  const getUploadDateKey = (file: FileRecord) => {
    const raw = String(file.upload_date || '').trim();
    if (!raw) return '';
    return raw.slice(0, 10);
  };

  const normalizedDateFrom = filters.dateFrom && filters.dateTo
    ? (filters.dateFrom <= filters.dateTo ? filters.dateFrom : filters.dateTo)
    : filters.dateFrom;

  const normalizedDateTo = filters.dateFrom && filters.dateTo
    ? (filters.dateFrom <= filters.dateTo ? filters.dateTo : filters.dateFrom)
    : filters.dateTo;

  const serverFileIds = new Set(files.map((file) => file.file_id));

  const optimisticFiles = localUploads
    .filter((upload) => upload.status === 'ERROR' || !upload.server_file_id || !serverFileIds.has(upload.server_file_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toOptimisticFileRecord);

  const displayTotal = total + optimisticFiles.length;

  const filteredFiles = [...optimisticFiles, ...files].filter((file) => {
    if (file.is_local_upload) {
      return true;
    }

    if (filters.sentiment && String(file.sentiment || '').toLowerCase() !== filters.sentiment) {
      return false;
    }

    if (filters.callType && getCallType(file) !== filters.callType) {
      return false;
    }

    const fileDateKey = getFileDateKey(file);

    if (normalizedDateFrom && (!fileDateKey || fileDateKey < normalizedDateFrom)) {
      return false;
    }

    if (normalizedDateTo && (!fileDateKey || fileDateKey > normalizedDateTo)) {
      return false;
    }

    if (filters.uploadDate) {
      const uploadDateKey = getUploadDateKey(file);
      if (!uploadDateKey || uploadDateKey !== filters.uploadDate) {
        return false;
      }
    }

    return true;
  });

  const paginatedFiles = filteredFiles.slice((page - 1) * perPage, page * perPage);

  const hasActiveFilters = Boolean(
    fileSearch || filters.brand || filters.sentiment || filters.callType || filters.dateFrom || filters.dateTo || filters.uploadDate
  );

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(filteredFiles.length / perPage));
    setTotalPages(nextTotalPages);
    if (page > nextTotalPages) {
      setPage(nextTotalPages);
    }
  }, [filteredFiles.length, page]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  };

  const getAutoIdLabel = (fileId: string) => `AUTO-${fileId.slice(0, 8).toUpperCase()}`;

  const getFileAutoIdLabel = (file: FileRecord) => {
    if (file.is_local_upload) {
      return file.status === 'ERROR' ? 'UPLOAD-ERR' : 'UPLOADING';
    }

    return getAutoIdLabel(file.file_id);
  };

  const getSentimentStyle = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'POSITIVE': return 'bg-emerald-50 text-emerald-600';
      case 'NEGATIVE': return 'bg-red-50 text-red-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const getStatusTone = (status: string) => {
    switch (String(status || '').toUpperCase()) {
      case 'COMPLETE':
        return 'complete';
      case 'ERROR':
        return 'error';
      case 'UPLOADING':
        return 'uploading';
      default:
        return 'processing';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="relative">
              {/* Decorative Frame */}
              <div className="absolute left-0 top-1 bottom-[34px] w-px bg-gradient-to-b from-blue-400 to-transparent opacity-60"></div>
              {/* 4-Point Star top-left */}
              <svg className="absolute -left-[5.5px] top-0 w-3 h-3 text-blue-500 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C12 0 12 10.5 24 12C24 12 12 13.5 12 24C12 24 12 13.5 0 12C0 12 12 10.5 12 0Z" />
              </svg>
              {/* Dot and horizontal line bottom-left */}
              <div className="absolute left-0 bottom-8 w-1.5 h-1.5 rounded-full bg-blue-500 -ml-[2px] opacity-80"></div>
              <div className="absolute left-1.5 bottom-[34.5px] right-24 h-px bg-gradient-to-r from-blue-400 via-blue-200 to-transparent opacity-60"></div>
              
              {/* Right Decorative Graphics (Swirls) */}
              <svg className="absolute -right-4 top-0 w-32 h-24 text-blue-300 pointer-events-none opacity-40 mix-blend-multiply hidden sm:block" viewBox="0 0 200 100" fill="none" stroke="currentColor">
                <path d="M150,80 Q100,80 120,40 T180,20" strokeWidth="0.5" fill="none"/>
                <path d="M130,90 Q80,90 90,50 T160,10" strokeWidth="0.5" fill="none"/>
                <path d="M160,70 C130,50 180,30 190,50 C200,70 170,90 140,80" strokeWidth="0.5" fill="none"/>
                <path d="M140,65 C140,65 140,75 145,75 C145,75 140,75 140,85 C140,85 140,75 135,75 C135,75 140,75 140,65Z" fill="#2563EB" stroke="none"/>
                <circle cx="160" cy="25" r="1.5" fill="currentColor"/>
                <circle cx="150" cy="15" r="1" fill="currentColor"/>
                <circle cx="185" cy="85" r="1.5" fill="currentColor"/>
              </svg>

              <div className="pl-6 pt-2 pb-6 relative z-10">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#2563EB] leading-none">Files</h1>
                  <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#0F172A] leading-none">Library</h1>
                  <span 
                    className="text-[32px] sm:text-[38px] md:text-[44px] leading-none ml-1 sm:ml-1.5 relative top-1.5 sm:top-2" 
                    style={{ 
                      fontFamily: 'var(--font-great-vibes), cursive', 
                      background: 'linear-gradient(to right, #0F172A, #2563EB, #60A5FA)', 
                      WebkitBackgroundClip: 'text', 
                      WebkitTextFillColor: 'transparent',
                      padding: '8px 12px 8px 0',
                      lineHeight: '1.2'
                    }}
                  >
                    Storage
                  </span>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#2563EB] uppercase">
                  <span>AUDIO ASSETS MANAGEMENT</span>
                  <span className="text-blue-200">|</span>
                  <span>{displayTotal.toLocaleString()} RECORDINGS</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 md:justify-end">
              <div className="text-right">
                <div className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">{displayTotal.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">รายการไฟล์ทั้งหมด</div>
              </div>
              <div className="hidden h-10 w-px bg-slate-200 sm:block"></div>
              <div className="text-right">
                <div className="text-2xl font-black tracking-tight text-blue-600 sm:text-3xl">{filteredFiles.length.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">ตามตัวเลือกตัวกรอง</div>
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Filter size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Filters</h2>
                  <p className="text-xs text-slate-500">Filter the file list by text, brand, sentiment, call type, call date, and upload date</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  accept={UPLOAD_ACCEPT}
                  className="hidden"
                  onChange={handleUploadSelection}
                />
                <button
                  onClick={handleUploadButtonClick}
                  suppressHydrationWarning
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  <CloudUpload size={16} />
                  <span>Upload File</span>
                </button>
                <button
                  onClick={clearFilters}
                  suppressHydrationWarning
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
              <label className="xl:col-span-4 flex flex-col gap-1">
                <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Search</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    suppressHydrationWarning
                    placeholder="Filter files by name, customer, brand, agent..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    value={fileSearch}
                    onChange={(e) => { setFileSearch(e.target.value); setPage(1); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchFiles(); }}
                  />
                </div>
              </label>

              <label className="xl:col-span-2 flex flex-col gap-1">
                <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Brand</span>
                <select
                  value={filters.brand}
                  suppressHydrationWarning
                  onChange={(e) => { setFilters({ ...filters, brand: e.target.value }); setPage(1); }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Brands</option>
                  {filterOptions.brands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </label>

              <label className="xl:col-span-2 flex flex-col gap-1">
                <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sentiment</span>
                <select
                  value={filters.sentiment}
                  suppressHydrationWarning
                  onChange={(e) => { setFilters({ ...filters, sentiment: e.target.value }); setPage(1); }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </label>

              <label className="xl:col-span-2 flex flex-col gap-1">
                <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Call Type</span>
                <select
                  value={filters.callType}
                  suppressHydrationWarning
                  onChange={(e) => { setFilters({ ...filters, callType: e.target.value }); setPage(1); }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Call Types</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>

              <div className="grid grid-cols-1 gap-3 md:col-span-2 xl:col-span-8 xl:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">From Date</span>
                  <input
                    type="date"
                    lang="en-GB"
                    suppressHydrationWarning
                    placeholder="dd/mm/yyyy"
                    value={filters.dateFrom}
                    onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1); }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">To Date</span>
                  <input
                    type="date"
                    lang="en-GB"
                    suppressHydrationWarning
                    placeholder="dd/mm/yyyy"
                    value={filters.dateTo}
                    onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1); }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Upload Date</span>
                  <input
                    type="date"
                    lang="en-GB"
                    suppressHydrationWarning
                    placeholder="dd/mm/yyyy"
                    value={filters.uploadDate}
                    onChange={(e) => { setFilters({ ...filters, uploadDate: e.target.value }); setPage(1); }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              From/To uses the call date shown in the table. Upload Date filters by the day the audio file was uploaded.
            </p>

            {loadingFilters && (
              <p className="mt-3 text-[11px] text-slate-400">Loading filter options from API...</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start space-x-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
                <p className="text-xs text-red-600 mt-1">ตรวจสอบว่ารัน: <code className="bg-red-100 px-1.5 py-0.5 rounded">uvicorn main:app --reload --port 8000</code></p>
              </div>
            </div>
          )}

          {/* File List */}
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">File Library</h3>
                <p className="text-xs text-slate-500">Browse and manage analyzed call files</p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                {files.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    disabled={deletingAll}
                    suppressHydrationWarning
                    className="flex items-center space-x-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Trash2 size={16} />
                    <span>{deletingAll ? 'Deleting...' : 'Delete All'}</span>
                  </button>
                )}
                <button
                  onClick={() => fetchFiles()}
                  suppressHydrationWarning
                  className="p-2.5 bg-slate-50 text-slate-500 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <RotateCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[640px] table-fixed text-left border-collapse">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="w-[24%] px-3 py-3 pl-5">File Name</th>
                    <th className="hidden 2xl:table-cell w-[9%] px-3 py-3">Auto ID</th>
                    <th className="w-[10%] px-3 py-3">Sentiment</th>
                    <th className="w-[13%] px-3 py-3">Customer</th>
                    <th className="hidden xl:table-cell w-[8%] px-3 py-3">Agent ID</th>
                    <th className="w-[9%] px-3 py-3">Brand</th>
                    <th className="w-[10%] px-3 py-3">Call Type</th>
                    <th className="hidden xl:table-cell w-[10%] px-3 py-3">Status</th>
                    <th className="hidden xl:table-cell w-[10%] px-3 py-3">Date</th>
                    <th className="w-[7%] px-3 py-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading && filteredFiles.length === 0 ? (
                    <tr><td colSpan={10} className="p-12 text-center text-slate-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                      <p className="text-sm">กำลังโหลดข้อมูล...</p>
                    </td></tr>
                  ) : filteredFiles.length === 0 ? (
                    <tr><td colSpan={10} className="p-12 text-center text-slate-400">
                      <FileAudio size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">ไม่พบไฟล์ที่ตรงกับตัวกรอง</p>
                      <p className="text-xs mt-1">ลองปรับ filters หรือกด Clear All</p>
                    </td></tr>
                  ) : (
                    paginatedFiles.map((file) => {
                      const isLocalUpload = Boolean(file.is_local_upload);
                      const canOpenFile = !isLocalUpload;
                      const autoIdLabel = getFileAutoIdLabel(file);
                      const statusTone = getStatusTone(file.status);

                      return (
                        <tr
                          key={file.file_id}
                          onClick={() => {
                            if (canOpenFile) {
                              router.push(`/files/${file.file_id}`);
                            }
                          }}
                          className={`border-0 transition-colors ${canOpenFile ? 'cursor-pointer group hover:bg-slate-50' : 'bg-blue-50/20'}`}
                        >
                          <td className="px-3 py-3 pl-5 align-middle">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${canOpenFile
                                ? 'bg-slate-50 text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600'
                                : 'bg-blue-50 text-blue-600'
                                }`}>
                                <FileAudio size={16} />
                              </div>
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-medium text-slate-800" title={file.name}>{file.name}</span>
                                <span className="mt-1 block truncate text-[10px] text-slate-400 2xl:hidden" title={autoIdLabel}>
                                  {autoIdLabel}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="hidden 2xl:table-cell px-3 py-3 align-middle">
                            {canOpenFile ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/files/${file.file_id}`);
                                }}
                                className="rounded bg-blue-50 px-2 py-1 font-mono text-[10px] font-bold text-blue-600 transition-all hover:bg-blue-600 hover:text-white cursor-pointer"
                                title="View Analysis"
                              >
                                {autoIdLabel}
                              </button>
                            ) : (
                              <span className="rounded bg-blue-50 px-2 py-1 font-mono text-[10px] font-bold text-blue-600">
                                {autoIdLabel}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <span className={`inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[10px] font-bold ${getSentimentStyle(file.sentiment)}`}>
                              {file.sentiment}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <div className="min-w-0">
                              <span className="block truncate text-sm text-slate-600" title={file.customer || '-'}>{file.customer || '-'}</span>
                              {file.local_upload_error ? (
                                <span className="mt-1 block truncate text-[10px] text-red-500" title={file.local_upload_error}>
                                  {file.local_upload_error}
                                </span>
                              ) : (
                                <span className="mt-1 block truncate text-[10px] text-slate-400 xl:hidden" title={`Agent: ${file.agent || '-'}`}>
                                  Agent: {file.agent || '-'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden xl:table-cell px-3 py-3 text-sm text-slate-600 align-middle">ID {file.agent || '-'}</td>
                          <td className="px-3 py-3 align-middle">
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-medium uppercase text-slate-800" title={file.brand || '-'}>{file.brand || '-'}</span>
                              <span className="mt-1 block truncate text-[10px] text-slate-400 xl:hidden" title={file.status || '-'}>
                                {file.status || '-'}
                              </span>
                              <span className="mt-1 block truncate text-[10px] text-slate-400 lg:hidden" title={formatDate(file.date)}>
                                {formatDate(file.date)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <span className={`inline-flex max-w-full truncate rounded-lg border px-2 py-1 text-[10px] font-bold ${getCallType(file) === 'inbound'
                              ? 'bg-blue-50 text-blue-600 border-blue-100'
                              : getCallType(file) === 'outbound'
                                ? 'bg-orange-50 text-orange-600 border-orange-100'
                                : 'bg-slate-50 text-slate-500 border-slate-100'
                              }`}>
                              {getCallType(file) === 'inbound' ? 'Inbound' : getCallType(file) === 'outbound' ? 'Outbound' : '-'}
                            </span>
                          </td>
                          <td className="hidden xl:table-cell px-3 py-3 align-middle">
                            <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-bold ${statusTone === 'complete'
                              ? 'text-emerald-500'
                              : statusTone === 'error'
                                ? 'text-red-500'
                                : statusTone === 'uploading'
                                  ? 'text-blue-600'
                                  : 'text-orange-500'
                              }`}>
                              {statusTone === 'complete' ? (
                                <CheckCircle2 size={12} />
                              ) : statusTone === 'error' ? (
                                <AlertCircle size={12} />
                              ) : statusTone === 'uploading' ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <RefreshCw size={12} className="animate-spin" />
                              )}
                              <span className="truncate max-w-[80px]">{file.status}</span>
                            </span>
                          </td>
                          <td className="hidden xl:table-cell px-3 py-3 text-sm text-slate-500 whitespace-nowrap align-middle">{formatDate(file.date)}</td>
                          <td className="px-3 py-3 align-middle">
                            {canOpenFile ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/files/${file.file_id}`);
                                  }}
                                  suppressHydrationWarning
                                  className="flex items-center justify-center rounded-lg p-1.5 text-blue-600 transition-all hover:bg-blue-100 cursor-pointer active:scale-95"
                                  title="View Analysis Detail"
                                >
                                  <ExternalLink size={16} />
                                </button>
                                <button
                                  onClick={(e) => handleDelete(file.file_id, e)}
                                  disabled={deleting === file.file_id}
                                  suppressHydrationWarning
                                  className="flex items-center justify-center rounded-lg p-1.5 text-red-500 transition-all hover:bg-red-50 cursor-pointer disabled:opacity-50 active:scale-95"
                                  title="Delete file"
                                >
                                  {deleting === file.file_id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                  ) : (
                                    <Trash size={16} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="text-right text-[10px] font-medium text-slate-400">
                                {statusTone === 'error' ? 'Upload failed' : 'Waiting...'}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
              <span>
                Showing <span className="font-bold text-slate-800">{paginatedFiles.length}</span> of <span className="font-bold text-slate-800">{filteredFiles.length}</span> entries
                {hasActiveFilters ? ` (filtered from ${displayTotal})` : ''}
              </span>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} suppressHydrationWarning
                  className="px-3 py-2 text-slate-400 cursor-pointer transition-colors hover:text-slate-600 disabled:opacity-30">PREVIOUS</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} suppressHydrationWarning
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium cursor-pointer transition-colors ${p === page ? 'bg-blue-700 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
                      }`}>{p}</button>
                ))}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} suppressHydrationWarning
                  className="px-3 py-2 text-slate-600 font-medium transition-colors hover:text-slate-800 cursor-pointer disabled:opacity-30">NEXT</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
