'use client';

import Sidebar from '@/components/Sidebar';
import { AudioWaveform, Sparkles, MessageCircle, Info, Lightbulb, RefreshCw, Trash2, ArrowLeft, Play, Pause, AlertCircle, Loader2, Tag } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TranscriptionLine { speaker: string; time: string; text: string; }

interface AnalysisData {
  analysis_id: string;
  file_id: string;
  agent_id: string;
  agent_name: string;
  customer_phone: string;
  sale_channel: string;
  call_duration_seconds: number;
  call_timestamp: string;
  brand_name: string;
  product_category: string;
  qa_score: number;
  csat_score: number;
  sentiment: string;
  sentiment_label: string;
  sentiment_reason: string;
  summary: string;
  summary_points: string[];
  transcription: TranscriptionLine[];
  key_insights: string;
  intent: string;
  keywords: string[];
  wav2vec2_emotion: { dominant: string; scores: { positive: number; neutral: number; negative: number } };
  model_versions: { whisper: string; wav2vec2: string; llama: string };
  created_at: string;
}

interface FileData {
  file_id: string;
  original_filename: string;
  customer_phone: string;
  agent_id: string;
  agent_name: string;
  sale_channel: string;
  call_date: string;
  upload_date: string;
}

export default function FileAnalysisDetail() {
  const router = useRouter();
  const params = useParams();
  const fileId = params.id as string;

  const [fileData, setFileData] = useState<FileData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchDetail();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [fileId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/audio/detail/${fileId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFileData(data.file);
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError('ไม่สามารถโหลดข้อมูลไฟล์ได้ — ตรวจสอบว่า Backend กำลังทำงาน');
    } finally {
      setLoading(false);
    }
  };

  // ── Audio Player ──
  const initAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(`${API_BASE}/api/v1/audio/play/${fileId}`);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setIsAudioLoaded(true);
    });
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('ended', () => setIsPlaying(false));
    audio.addEventListener('error', () => setError('ไม่สามารถโหลดไฟล์เสียงได้'));
    audioRef.current = audio;
    return audio;
  }, [fileId]);

  const togglePlay = () => {
    const audio = initAudio();
    if (isPlaying) { audio.pause(); } else { audio.play(); }
    setIsPlaying(!isPlaying);
  };

  const seekAudio = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = initAudio();
    const bar = progressRef.current;
    if (!bar || !audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = pct * audio.duration;
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '00:00';
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── AI re-analysis ──
  const triggerAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/analyze/${fileId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Analysis request failed');
      const data = await res.json();
      const taskId = data.task_id;
      let attempts = 0;
      while (attempts < 20) {
        await new Promise(r => setTimeout(r, 2000));
        const sr = await fetch(`${API_BASE}/api/v1/ai/status/${taskId}`);
        const sd = await sr.json();
        if (sd.status === 'completed') { await fetchDetail(); break; }
        if (sd.status === 'failed') throw new Error('Analysis failed');
        attempts++;
      }
    } catch { setError('การวิเคราะห์ล้มเหลว'); }
    finally { setAnalyzing(false); }
  };

  const handleDelete = async () => {
    if (!confirm('ต้องการลบไฟล์นี้จริงหรือไม่?')) return;
    try {
      await fetch(`${API_BASE}/api/v1/audio/delete/${fileId}`, { method: 'DELETE' });
      router.push('/files');
    } catch { setError('ลบไฟล์ไม่สำเร็จ'); }
  };

  // ── Sentiment badge ──
  const getSentimentBadge = (s: string) => {
    const sl = s?.toLowerCase();
    if (sl === 'positive') return { label: 'POSITIVE SENTIMENT', color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' };
    if (sl === 'negative') return { label: 'NEGATIVE SENTIMENT', color: 'bg-red-50 text-red-600', dot: 'bg-red-500' };
    return { label: 'NEUTRAL SENTIMENT', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  };

  // ── Loading / Error states ──
  if (loading) return (
    <div className="flex h-screen bg-slate-50"><Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center"><Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-3" /><p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p></div>
      </main>
    </div>
  );

  if (error && !fileData) return (
    <div className="flex h-screen bg-slate-50"><Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center"><AlertCircle size={32} className="text-red-500 mx-auto mb-3" /><p className="text-sm text-red-600">{error}</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline cursor-pointer">กลับ</button>
        </div>
      </main>
    </div>
  );

  const sentimentBadge = analysis ? getSentimentBadge(analysis.sentiment) : null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div className="flex flex-col items-start">
              <button onClick={() => router.push('/files')}
                className="flex items-center text-slate-500 hover:text-slate-800 transition-colors mb-4 cursor-pointer group w-fit -ml-1">
                <ArrowLeft size={18} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[13px] font-bold">Back to Files</span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-800">
                  <AudioWaveform size={24} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight truncate max-w-[500px]">
                  {fileData?.original_filename || 'Unknown'}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2.5">
              <button onClick={triggerAnalysis} disabled={analyzing}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50">
                <RefreshCw size={16} className={`text-slate-400 ${analyzing ? 'animate-spin' : ''}`} />
                <span>{analyzing ? 'กำลังวิเคราะห์...' : 're-Analyze'}</span>
              </button>
              <button onClick={handleDelete}
                className="flex items-center space-x-2 px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all cursor-pointer shadow-sm active:scale-95">
                <Trash2 size={16} /><span>Delete</span>
              </button>
            </div>
          </div>

          {/* ── No Analysis ── */}
          {!analysis && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
              <AlertCircle size={32} className="text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-amber-800 mb-2">ยังไม่ได้วิเคราะห์ไฟล์นี้</h3>
              <p className="text-sm text-amber-600 mb-4">กดปุ่ม &quot;re-Analyze&quot; เพื่อเริ่มวิเคราะห์ด้วย AI (Whisper → Wav2Vec2 → Llama)</p>
              <button onClick={triggerAnalysis} disabled={analyzing}
                className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50">
                {analyzing ? 'กำลังวิเคราะห์...' : 'เริ่มวิเคราะห์ด้วย AI'}
              </button>
            </div>
          )}

          {analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ════════════ LEFT COLUMN ════════════ */}
              <div className="lg:col-span-2 space-y-6">

                {/* ── Conversation Summary (Llama สรุปจาก Whisper STT) ── */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center space-x-3 mb-1">
                    <Sparkles className="text-slate-800" size={24} />
                    <h2 className="text-lg font-bold text-slate-800">Conversation Summary</h2>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-5 ml-9">วิเคราะห์โดย Llama 3.3 จากข้อมูล Speech-to-Text ของ Whisper</p>
                  {analysis.summary_points && analysis.summary_points.length > 0 ? (
                    <ul className="space-y-3.5 text-slate-600 text-sm list-disc pl-5 marker:text-slate-300">
                      {analysis.summary_points.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm">{analysis.summary}</p>
                  )}
                </div>

                {/* ── Transcription Detail (Whisper STT) ── */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="text-slate-800" size={24} />
                      <h2 className="text-lg font-bold text-slate-800">Transcription Detail</h2>
                    </div>
                    {sentimentBadge && (
                      <span className={`px-3 py-1 ${sentimentBadge.color} text-xs font-bold rounded-full flex items-center space-x-1.5`}>
                        <span className={`w-1.5 h-1.5 ${sentimentBadge.dot} rounded-full`}></span>
                        <span>{sentimentBadge.label}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mb-5 ml-9">ถอดคำโดย Whisper Large V3 | Sentiment โดย Llama (STT + Wav2Vec2)</p>

                  {analysis.transcription && analysis.transcription.length > 0 ? (
                    <div className="space-y-5">
                      {analysis.transcription.map((line, idx) =>
                        line.speaker === 'agent' ? (
                          <div key={idx}>
                            <div className="flex items-center space-x-2 mb-1.5">
                              <span className="text-xs font-bold text-blue-700">AGENT</span>
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{line.time}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl rounded-tl-sm text-slate-700 text-sm w-[88%]">
                              {line.text}
                            </div>
                          </div>
                        ) : (
                          <div key={idx} className="flex flex-col items-end">
                            <div className="flex items-center space-x-2 mb-1.5">
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{line.time}</span>
                              <span className="text-xs font-bold text-slate-600">CUSTOMER</span>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl rounded-tr-sm text-slate-700 text-sm w-[88%]">
                              {line.text}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-8">ไม่มีข้อมูล Transcription</p>
                  )}
                </div>
              </div>

              {/* ════════════ RIGHT COLUMN ════════════ */}
              <div className="space-y-6">

                {/* ── Metadata / Details (parsed from filename + AI) ── */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center space-x-3 mb-6 pb-5 border-b border-slate-100">
                    <Info className="text-slate-800" size={24} />
                    <h2 className="text-lg font-bold text-slate-800">Metadata / Details</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                    {/* From filename */}
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Phone</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {fileData?.customer_phone || analysis?.customer_phone || 'N/A'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Agent ID</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {analysis?.agent_id || fileData?.agent_id || 'N/A'}
                        {(analysis?.agent_name || fileData?.agent_name) && (
                          <span className="text-slate-500 font-normal"> ({analysis?.agent_name || fileData?.agent_name})</span>
                        )}
                      </p>
                    </div>

                    {/* From AI (Brand/Product detected from transcript) */}
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Brand</p>
                      <p className="text-sm font-semibold text-slate-800">{analysis?.brand_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Product</p>
                      <p className="text-sm font-semibold text-slate-800">{analysis?.product_category || '-'}</p>
                    </div>

                    {/* From filename */}
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sale Channel</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {fileData?.sale_channel || analysis?.sale_channel || '-'}
                      </p>
                    </div>

                    {/* From AI */}
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">QA Score</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {analysis?.qa_score != null ? (
                          <span className={analysis.qa_score >= 7 ? 'text-emerald-600' : analysis.qa_score >= 5 ? 'text-amber-600' : 'text-red-600'}>
                            {analysis.qa_score}/10
                          </span>
                        ) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">CSAT</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {analysis?.csat_score != null ? (
                          <span className={analysis.csat_score >= 4 ? 'text-emerald-600' : analysis.csat_score >= 3 ? 'text-amber-600' : 'text-red-600'}>
                            {analysis.csat_score}/5
                          </span>
                        ) : '-'}
                      </p>
                    </div>

                    <div className="col-span-2 pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Analysis Date</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {analysis?.created_at
                          ? new Date(analysis.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* ── Seekable Audio Player ── */}
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <div className="bg-slate-900 rounded-xl p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <button onClick={togglePlay}
                          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-blue-700 transition-colors shrink-0 active:scale-95">
                          {isPlaying
                            ? <Pause size={18} />
                            : <Play size={18} className="ml-0.5" />
                          }
                        </button>
                        <div className="flex-1 min-w-0">
                          {/* Seekable progress bar */}
                          <div
                            ref={progressRef}
                            onClick={seekAudio}
                            className="w-full h-2 bg-slate-700 rounded-full cursor-pointer relative group"
                          >
                            {/* Filled portion */}
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-100 relative"
                              style={{ width: `${progressPct}%` }}
                            >
                              {/* Drag handle */}
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity border-2 border-blue-500" />
                            </div>
                          </div>
                          {/* Time labels */}
                          <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] text-slate-400 font-mono">{formatTime(currentTime)}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{formatTime(duration)}</span>
                          </div>
                        </div>
                      </div>
                      {/* Waveform visualization */}
                      <div className="flex gap-[2px] items-end h-8 overflow-hidden px-1">
                        {Array.from({ length: 50 }, (_, i) => {
                          const barPct = (i / 50) * 100;
                          const isActive = barPct <= progressPct;
                          const h = [12, 18, 28, 22, 10, 15, 24, 30, 16, 8, 13, 20, 26, 14, 9, 17, 22, 28, 15, 6, 11, 19, 27, 21, 14, 8, 16, 24, 20, 12, 18, 26, 22, 10, 14, 20, 28, 16, 8, 12, 18, 24, 20, 14, 10, 16, 22, 18, 12, 8][i];
                          return (
                            <div key={i}
                              className={`flex-1 rounded-sm transition-colors duration-150 ${isActive ? 'bg-blue-500' : 'bg-slate-600'}`}
                              style={{ height: `${h}px`, minWidth: '2px' }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Source labels */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded">📁 Phone/Agent/Channel จากชื่อไฟล์</span>
                    <span className="text-[9px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded">🤖 Brand/Product/QA/CSAT จาก AI</span>
                  </div>
                </div>

                {/* ── Key Insights (Llama) ── */}
                {analysis?.key_insights && (
                  <div className="bg-blue-800 rounded-2xl p-6 text-white relative overflow-hidden shadow-md">
                    <div className="absolute -bottom-6 -right-4 text-[90px] font-bold text-blue-700/40 leading-none select-none pointer-events-none">💡</div>
                    <div className="relative z-10">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-blue-700/50 p-2 rounded-lg"><Lightbulb size={20} className="text-white" /></div>
                        <h2 className="text-lg font-bold">Key Insights</h2>
                      </div>
                      <p className="text-sm text-blue-100 leading-relaxed">{analysis.key_insights}</p>
                      {analysis.wav2vec2_emotion && (
                        <div className="mt-4 pt-3 border-t border-blue-700/50">
                          <p className="text-[10px] text-blue-300 font-bold uppercase mb-2">Wav2Vec2 Emotion Analysis</p>
                          <div className="flex gap-2">
                            {Object.entries(analysis.wav2vec2_emotion.scores).map(([k, v]) => (
                              <div key={k} className="flex-1 text-center">
                                <div className="text-[10px] text-blue-300 capitalize mb-1">{k}</div>
                                <div className="h-1.5 bg-blue-900 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${k === 'positive' ? 'bg-emerald-400' : k === 'negative' ? 'bg-red-400' : 'bg-slate-400'}`}
                                    style={{ width: `${(v as number) * 100}%` }} />
                                </div>
                                <div className="text-[10px] text-blue-200 mt-0.5">{((v as number) * 100).toFixed(0)}%</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Keywords ── */}
                {analysis?.keywords && analysis.keywords.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center space-x-2 mb-3">
                      <Tag size={16} className="text-slate-600" />
                      <h3 className="text-sm font-bold text-slate-800">Keywords</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keywords.map((kw, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── AI Model Info ── */}
                {analysis?.model_versions && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">AI Models Used</p>
                    <div className="space-y-1 text-[11px] text-slate-500">
                      <p>🎙️ STT: <span className="font-medium text-slate-700">{analysis.model_versions.whisper}</span></p>
                      <p>🎭 Emotion: <span className="font-medium text-slate-700">{analysis.model_versions.wav2vec2}</span></p>
                      <p>🧠 NLP: <span className="font-medium text-slate-700">{analysis.model_versions.llama}</span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
