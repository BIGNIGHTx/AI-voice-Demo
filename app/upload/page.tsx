'use client';

import Sidebar from '@/components/Sidebar';
import { FileUp, Music, X, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useRef, DragEvent, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { logClientActivity } from '@/lib/activity-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SUPPORTED_FORMATS = ['MP3', 'WAV', 'M4A', 'AAC', 'OGG', 'FLAC', 'WMA', 'OPUS'];

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : 'Upload failed';

  const getApiErrorMessage = useCallback(async (response: Response) => {
    try {
      const payload: unknown = await response.json();
      if (payload && typeof payload === 'object') {
        const detail = typeof (payload as { detail?: unknown }).detail === 'string'
          ? (payload as { detail: string }).detail.trim()
          : '';

        if (detail) return detail;

        const message = typeof (payload as { message?: unknown }).message === 'string'
          ? (payload as { message: string }).message.trim()
          : '';

        if (message) return message;
      }
    } catch {
      // ignore JSON parse failure and fall back to HTTP status
    }

    return `HTTP ${response.status}`;
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: QueuedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      if (!SUPPORTED_FORMATS.includes(ext)) continue;
      // Prevent duplicates
      if (queue.some(q => q.name === file.name && q.file.size === file.size)) continue;

      newFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        name: file.name,
        size: formatSize(file.size),
        status: 'pending',
      });
    }
    setQueue(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setQueue(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const processUpload = useCallback(async () => {
    if (queue.length === 0 || isProcessing) return;
    setIsProcessing(true);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status !== 'pending') continue;

      let serverFileId = '';

      // Update status to uploading
      setQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' as const } : f));

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('customer_phone', 'N/A');
        formData.append('agent_id', 'N/A');

        const res = await fetch(`${API_BASE}/api/v1/audio/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error(await getApiErrorMessage(res));

        const payload: unknown = await res.json().catch(() => null);
        serverFileId = payload && typeof payload === 'object' && typeof (payload as { file_id?: unknown }).file_id === 'string'
          ? (payload as { file_id: string }).file_id.trim()
          : '';

        if (!serverFileId) {
          throw new Error('Upload succeeded but no file_id was returned');
        }

        await logClientActivity({
          action: 'AUDIO_FILE_UPLOADED',
          target: serverFileId,
          routePath: '/upload',
          metadata: {
            fileName: item.name,
            source: 'upload-page',
          },
        });

        setQueue(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'done' as const } : f
        ));

        void fetch('/api/background-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: serverFileId }),
        })
          .then(async (analysisRes) => {
            if (!analysisRes.ok) throw new Error(await getApiErrorMessage(analysisRes));

            await logClientActivity({
              action: 'AUDIO_ANALYSIS_REQUESTED',
              target: serverFileId,
              routePath: '/upload',
              metadata: {
                fileName: item.name,
                source: 'upload-page-auto-analysis',
              },
            });
          })
          .catch((err: unknown) => {
            const baseMessage = getErrorMessage(err);
            setQueue(prev => prev.map(f =>
              f.id === item.id ? { ...f, status: 'error' as const, error: `Upload complete but auto analysis failed: ${baseMessage}` } : f
            ));
          });
      } catch (err: unknown) {
        const baseMessage = getErrorMessage(err);
        const errorMessage = serverFileId
          ? `Upload complete but auto analysis failed: ${baseMessage}`
          : baseMessage;

        setQueue(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'error' as const, error: errorMessage } : f
        ));
      }
    }

    setIsProcessing(false);
  }, [getApiErrorMessage, isProcessing, queue]);

  useEffect(() => {
    if (isProcessing || !queue.some((item) => item.status === 'pending')) return;
    void processUpload();
  }, [isProcessing, processUpload, queue]);

  const allDone = queue.length > 0 && queue.every(f => f.status === 'done' || f.status === 'error');
  const doneCount = queue.filter(f => f.status === 'done').length;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="relative">
            {/* Decorative Frame */}
            <div className="absolute left-0 top-1 bottom-[34px] w-px bg-gradient-to-b from-orange-400 to-transparent opacity-60"></div>
            {/* 4-Point Star top-left */}
            <svg className="absolute -left-[5.5px] top-0 w-3 h-3 text-orange-500 opacity-80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C12 0 12 10.5 24 12C24 12 12 13.5 12 24C12 24 12 13.5 0 12C0 12 12 10.5 12 0Z" />
            </svg>
            {/* Dot and horizontal line bottom-left */}
            <div className="absolute left-0 bottom-8 w-1.5 h-1.5 rounded-full bg-orange-500 -ml-[2px] opacity-80"></div>
            <div className="absolute left-1.5 bottom-[34.5px] right-24 h-px bg-gradient-to-r from-orange-400 via-orange-200 to-transparent opacity-60"></div>
            
            {/* Right Decorative Graphics (Swirls) */}
            <svg className="absolute -right-4 top-0 w-32 h-24 text-orange-300 pointer-events-none opacity-40 mix-blend-multiply hidden sm:block" viewBox="0 0 200 100" fill="none" stroke="currentColor">
              <path d="M150,80 Q100,80 120,40 T180,20" strokeWidth="0.5" fill="none"/>
              <path d="M130,90 Q80,90 90,50 T160,10" strokeWidth="0.5" fill="none"/>
              <path d="M160,70 C130,50 180,30 190,50 C200,70 170,90 140,80" strokeWidth="0.5" fill="none"/>
              <path d="M140,65 C140,65 140,75 145,75 C145,75 140,75 140,85 C140,85 140,75 135,75 C135,75 140,75 140,65Z" fill="#EA580C" stroke="none"/>
              <circle cx="160" cy="25" r="1.5" fill="currentColor"/>
              <circle cx="150" cy="15" r="1" fill="currentColor"/>
              <circle cx="185" cy="85" r="1.5" fill="currentColor"/>
            </svg>

            <div className="pl-6 pt-2 pb-6 relative z-10">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#EA580C] leading-none">Upload</h1>
                <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#0F172A] leading-none">Asset</h1>
                <span 
                  className="text-[32px] sm:text-[38px] md:text-[44px] leading-none ml-1 sm:ml-1.5 relative top-1.5 sm:top-2" 
                  style={{ 
                    fontFamily: 'var(--font-great-vibes), cursive', 
                    background: 'linear-gradient(to right, #0F172A, #EA580C, #FB923C)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent',
                    padding: '8px 12px 8px 0',
                    lineHeight: '1.2'
                  }}
                >
                  Media
                </span>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#EA580C] uppercase">
                <span>NEW CONTENT PROCESSING</span>
                <span className="text-orange-200">|</span>
                <span>MAX 500MB PER FILE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleSelectFiles}
            className={`group flex min-h-[320px] flex-1 cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed p-8 transition-all sm:min-h-[380px] sm:p-10 xl:min-h-[420px] ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-blue-200'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,.wma,.opus"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 sm:mb-5 sm:h-16 sm:w-16 ${
              isDragging ? 'bg-blue-100 text-blue-700 scale-110' : 'bg-blue-50 text-blue-700'
            }`}>
              <FileUp size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {isDragging ? 'วางไฟล์ที่นี่' : 'Drag and drop file'}
            </h3>
            <p className="text-slate-400 text-xs mb-8 text-center max-w-[280px] leading-relaxed">
              Maximum 500mb. Supported formats: <span className="text-slate-500 font-medium">{SUPPORTED_FORMATS.join(', ')}</span>
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); handleSelectFiles(); }}
              className="bg-blue-700 hover:bg-blue-800 text-white px-10 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 cursor-pointer active:scale-95"
            >
              Select Files
            </button>
          </div>

          {/* Right Sidebar - File Queue */}
          <div className="w-80 flex flex-col">
            <h2 className="text-lg font-medium text-slate-800 mb-4">
              File Queue {queue.length > 0 && <span className="text-sm text-slate-400">({queue.length})</span>}
            </h2>

            <div className="space-y-2 mb-6 max-h-[350px] overflow-y-auto pr-2">
              {queue.length === 0 ? (
                <div className="text-center py-12 text-slate-300">
                  <Music size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">เลือกหรือลากไฟล์มาวาง</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className={`flex items-center p-2.5 bg-white border rounded-xl shadow-sm transition-colors ${
                    item.status === 'done' ? 'border-emerald-200 bg-emerald-50/50' :
                    item.status === 'error' ? 'border-red-200 bg-red-50/50' :
                    item.status === 'uploading' ? 'border-blue-200 bg-blue-50/50' :
                    'border-slate-100 hover:border-blue-100'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0 ${
                      item.status === 'done' ? 'bg-emerald-100 text-emerald-600' :
                      item.status === 'error' ? 'bg-red-100 text-red-600' :
                      item.status === 'uploading' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-50 text-blue-600'
                    }`}>
                      {item.status === 'done' ? <CheckCircle2 size={16} /> :
                       item.status === 'error' ? <AlertCircle size={16} /> :
                       item.status === 'uploading' ? <Loader2 size={16} className="animate-spin" /> :
                       <Music size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{item.name}</p>
                       <p className="text-[10px] text-slate-400">
                         {item.status === 'done' ? '✓ Upload complete, analysis started' :
                          item.status === 'error' ? `✗ ${item.error || 'Failed'}` :
                          item.status === 'uploading' ? 'Uploading...' :
                          `${item.size} • ${item.name.split('.').pop()?.toUpperCase()}`}
                      </p>
                    </div>
                    {item.status === 'pending' && (
                      <button
                        onClick={() => removeFile(item.id)}
                        className="text-slate-300 hover:text-slate-500 p-1 cursor-pointer shrink-0"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {allDone ? (
              <button
                onClick={() => router.push('/files')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full py-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={20} />
                <span>ดูไฟล์ทั้งหมด ({doneCount} uploaded)</span>
              </button>
            ) : (
              <button
                onClick={processUpload}
                disabled={queue.length === 0 || isProcessing}
                className="bg-blue-700 hover:bg-blue-800 text-white w-full py-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Uploading and analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Process Upload Now</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            )}
            <p className="text-[10px] text-slate-400 text-center mt-3 px-4">
              By uploading, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
