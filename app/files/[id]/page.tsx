'use client';

import Sidebar from '@/components/Sidebar';
import { AudioWaveform, Sparkles, MessageCircle, Info, Lightbulb, RefreshCw, Trash2, ArrowLeft, Play, Pause, AlertCircle, Loader2, Tag, Key, Star, Smile } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { logClientActivity } from '@/lib/activity-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TranscriptionLine {
  speaker: string;
  speaker_id?: string;
  time?: string;
  start?: number;
  end?: number;
  timecode?: string;
  subtitle?: string;
  text?: string;
}

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
  summary_text?: string;
  summary_points: string[];
  transcription: TranscriptionLine[];
  full_transcript?: string;
  key_insights: string;
  intent: string;
  keywords: string[];
  wav2vec2_emotion: { dominant: string; scores: { positive: number; neutral: number; negative: number } };
  model_versions: { whisper: string; wav2vec2: string; llama: string };
  created_at: string;
  serial_no?: string;
  warranty_period?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  purchase_date?: string;
  date_of_purchase?: string;
  expiry_date_of_warranty?: string;
  registrationDate?: string;
}

interface EnhancedAnalysis {
  entities: {
    brands: string[];
    products: string[];
    orders: string[];
    amounts: { value: number; currency: string }[];
  };
  keywords: {
    keywords: string[];
    categories: Record<string, { matched: string[]; count?: number }>;
    sentiment_indicators?: string[];
    urgency_level?: string;
  };
  topic: {
    primary_category: string;
    secondary_categories?: string[];
    confidence: number;
  };
  qaScore: {
    overall_score: number;
    grade: string;
    criteria: Record<string, { score: number; max_score: number }>;
    strengths: string[];
    areas_for_improvement: string[];
  };
  csat: {
    csat_score: number;
    reasoning: string;
  };
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

type ConversationRole = 'Agent' | 'Customer';

interface SpeakerResolutionContext {
  agentId?: string;
  agentName?: string;
  customerPhone?: string;
}

interface SpeakerGroupStats {
  key: string;
  firstIndex: number;
  agentScore: number;
  customerScore: number;
  explicitRole: ConversationRole | null;
}

interface TranscriptSegment extends TranscriptionLine {
  role: ConversationRole;
  textValue: string;
  startSec: number;
  endSec: number;
  canSeek: boolean;
}

const normalizeSpeakerToken = (value?: string): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const hasStructuredSpeakerLabel = (line: TranscriptionLine): boolean =>
  Boolean(normalizeSpeakerToken(line.speaker) || normalizeSpeakerToken(line.speaker_id));

const getExplicitSpeakerRole = (line: TranscriptionLine): ConversationRole | null => {
  const raw = `${normalizeSpeakerToken(line.speaker)} ${normalizeSpeakerToken(line.speaker_id)}`;

  if (/(^|\s)(agent|เจ้าหน้าที่|พนักงาน|support|admin)(\s|$)/i.test(raw)) return 'Agent';
  if (/(^|\s)(customer|ลูกค้า|caller|ผู้ซื้อ)(\s|$)/i.test(raw)) return 'Customer';

  return null;
};

const getSpeakerGroupKey = (line: TranscriptionLine, index: number): string => {
  const speaker = normalizeSpeakerToken(line.speaker);
  const speakerId = normalizeSpeakerToken(line.speaker_id);
  const raw = speaker || speakerId;

  if (!raw) return `unknown_${index}`;
  if (raw === 'agent') return 'explicit_agent';
  if (raw === 'customer' || raw === 'caller') return 'explicit_customer';

  const alphaMatch = raw.match(/(?:speaker|spk)?_?([ab])(?![a-z0-9])/i);
  if (alphaMatch) return `speaker_${alphaMatch[1].toLowerCase()}`;

  const numericMatch = raw.match(/(?:speaker|spk|speaker_id)?_?(\d+)/i);
  if (numericMatch) return `speaker_${numericMatch[1]}`;

  return raw;
};

const countMatches = (text: string, patterns: RegExp[]): number =>
  patterns.reduce((total, pattern) => total + (text.match(pattern)?.length ?? 0), 0);

const normalizeTranscription = (analysisPayload: unknown): TranscriptionLine[] => {
  if (!analysisPayload || typeof analysisPayload !== 'object') return [];
  const a = analysisPayload as Record<string, unknown>;

  const candidates = [
    a.subtitle_segments,
    a.transcription_detail,
    a.subtitles,
    (a.analysis_detail as Record<string, unknown> | undefined)?.transcription,
    a.transcription,
  ];

  const rows = candidates.find((x) => Array.isArray(x)) as unknown[] | undefined;
  if (!rows) return [];

  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      speaker: String(row.speaker ?? ''),
      speaker_id: row.speaker_id ? String(row.speaker_id) : undefined,
      time: row.time ? String(row.time) : undefined,
      start: typeof row.start === 'number' ? row.start : undefined,
      end: typeof row.end === 'number' ? row.end : undefined,
      timecode: row.timecode ? String(row.timecode) : undefined,
      subtitle: row.subtitle ? cleanTranscriptText(row.subtitle) : undefined,
      text: row.text ? cleanTranscriptText(row.text) : undefined,
    }))
    .filter((line) => !!(line.subtitle || line.text));
};

const cleanTranscriptText = (value: unknown): string => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s\.,!?():;/%\-"'@#&+]/g, ' ')
    .replace(/([!?.,]){3,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
};

const pickFullTranscriptionText = (line: TranscriptionLine): string => {
  const subtitle = (line.subtitle || '').trim();
  const text = (line.text || '').trim();
  if (!subtitle && !text) return '';
  if (!subtitle) return text;
  if (!text) return subtitle;
  return text.length >= subtitle.length ? text : subtitle;
};

const parseTimestampToSeconds = (value?: string | number): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  const raw = String(value || '').trim();
  if (!raw) return null;
  const simpleNumber = Number(raw);
  if (Number.isFinite(simpleNumber)) return Math.max(0, simpleNumber);
  const normalized = raw.replace(/,/g, '.');
  const timeMatch = normalized.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?|\d+(?:\.\d+)?)/);
  if (!timeMatch) return null;
  const token = timeMatch[1];
  if (!token.includes(':')) {
    const seconds = Number(token);
    return Number.isFinite(seconds) ? Math.max(0, seconds) : null;
  }
  const parts = token.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 3) return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
  return Math.max(0, parts[0]);
};

const getTranscriptTimeRange = (line: TranscriptionLine): { start: number | null; end: number | null } => {
  const fromNumeric = {
    start: typeof line.start === 'number' && Number.isFinite(line.start) ? Math.max(0, line.start) : null,
    end: typeof line.end === 'number' && Number.isFinite(line.end) ? Math.max(0, line.end) : null,
  };
  if (fromNumeric.start !== null || fromNumeric.end !== null) return fromNumeric;
  const timecode = String(line.timecode || '').trim();
  if (timecode) {
    const parts = timecode.split(/-->|->|–|-/).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return { start: parseTimestampToSeconds(parts[0]), end: parseTimestampToSeconds(parts[1]) };
    }
  }
  return { start: parseTimestampToSeconds(line.time), end: null };
};

const AGENT_CUE_PATTERNS = [
  /ขอบคุณที่ติดต่อ|ยินดีให้บริการ|มีอะไรให้ช่วย|ขออนุญาต|รบกวน|ขอตรวจสอบ|ตรวจสอบให้|รอสักครู่|ยืนยันข้อมูล|ขอชื่อ|ขอเบอร์|ขอหมายเลข|ขอข้อมูล|รับเรื่อง|ประสานงาน|ติดต่อกลับ|เรียนแจ้ง|ไม่ทราบว่า|สะดวกไหม/gi,
  /(?:สวัสดี(?:ค่ะ|ครับ)?)/gi,
  /(?:เดี๋ยว|ขอ)\s*(?:ผม|ฉัน|เจ้าหน้าที่)?\s*(?:ตรวจสอบ|เช็ก|เช็ค|ประสานงาน)/gi,
];

const CUSTOMER_CUE_PATTERNS = [
  /มีปัญหา|ใช้งานไม่ได้|ใช้ไม่ได้|เปิดไม่ติด|ชำรุด|เสีย|พัง|เคลม|คืนเงิน|เปลี่ยน(?:สินค้า|เครื่อง)|ไม่ได้รับ|ส่งผิด|สั่งซื้อ|ซื้อมา|ได้รับสินค้า|แจ้งปัญหา|ขอสอบถาม|สอบถามเรื่อง|ช่วยดูให้หน่อย|ทำยังไง|ทำอย่างไร|ต้องการ|อยาก/gi,
  /(?:ผม|ดิฉัน|ฉัน|หนู|ลูกค้า)\s*(?:ต้องการ|อยาก|ซื้อ|สั่ง|ได้รับ|มีปัญหา|แจ้ง|สอบถาม)/gi,
  /(?:เครื่อง|สินค้า|ออเดอร์|order|เลขที่สั่งซื้อ).*(?:เสีย|มีปัญหา|ไม่ได้|พัง|เคลม)/gi,
];

const scoreLineForRole = (text: string, lineIndex: number, context: SpeakerResolutionContext): { agent: number; customer: number } => {
  const cleaned = cleanTranscriptText(text);
  if (!cleaned) return { agent: lineIndex === 0 ? 1 : 0, customer: 0 };
  let agent = countMatches(cleaned, AGENT_CUE_PATTERNS) * 2;
  let customer = countMatches(cleaned, CUSTOMER_CUE_PATTERNS) * 2;
  if (lineIndex === 0) agent += 1.5;
  const digits = cleaned.replace(/\D/g, '');
  const customerPhoneDigits = String(context.customerPhone || '').replace(/\D/g, '');
  if (customerPhoneDigits && digits.includes(customerPhoneDigits)) customer += 1;
  const agentId = String(context.agentId || '').trim().toLowerCase();
  if (agentId && cleaned.toLowerCase().includes(agentId)) agent += 0.5;
  const agentName = String(context.agentName || '').trim().toLowerCase();
  if (agentName && cleaned.toLowerCase().includes(agentName)) customer += 0.5;
  return { agent, customer };
};

const resolveTranscriptionRoles = (lines: TranscriptionLine[], context: SpeakerResolutionContext): ConversationRole[] => {
  if (lines.length === 0) return [];
  const hasSpeakerMetadata = lines.some(hasStructuredSpeakerLabel);

  if (!hasSpeakerMetadata) {
    let previousRole: ConversationRole = 'Agent';
    return lines.map((line, index) => {
      const text = pickFullTranscriptionText(line);
      const { agent, customer } = scoreLineForRole(text, index, context);
      if (agent > customer + 0.5) { previousRole = 'Agent'; return 'Agent'; }
      if (customer > agent + 0.5) { previousRole = 'Customer'; return 'Customer'; }
      previousRole = index === 0 ? 'Agent' : (previousRole === 'Agent' ? 'Customer' : 'Agent');
      return previousRole;
    });
  }

  const groups = new Map<string, SpeakerGroupStats>();
  lines.forEach((line, index) => {
    const key = getSpeakerGroupKey(line, index);
    const explicitRole = getExplicitSpeakerRole(line);
    const text = pickFullTranscriptionText(line);
    const { agent, customer } = scoreLineForRole(text, index, context);
    const existing = groups.get(key) ?? { key, firstIndex: index, agentScore: 0, customerScore: 0, explicitRole: null };
    existing.firstIndex = Math.min(existing.firstIndex, index);
    existing.agentScore += agent;
    existing.customerScore += customer;
    if (explicitRole === 'Agent') { existing.agentScore += 100; existing.explicitRole = 'Agent'; }
    if (explicitRole === 'Customer') { existing.customerScore += 100; existing.explicitRole = 'Customer'; }
    groups.set(key, existing);
  });

  const sortedGroups = Array.from(groups.values()).sort((a, b) => a.firstIndex - b.firstIndex);
  const roleByKey = new Map<string, ConversationRole>();
  sortedGroups.forEach((group) => { if (group.explicitRole) roleByKey.set(group.key, group.explicitRole); });
  const usedKeys = new Set(roleByKey.keys());
  const remainingGroups = () => sortedGroups.filter((group) => !usedKeys.has(group.key));

  const pickBestGroup = (target: ConversationRole): SpeakerGroupStats | null => {
    const candidates = remainingGroups();
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => {
      const aScore = target === 'Agent' ? a.agentScore - a.customerScore : a.customerScore - a.agentScore;
      const bScore = target === 'Agent' ? b.agentScore - b.customerScore : b.customerScore - b.agentScore;
      if (bScore !== aScore) return bScore - aScore;
      return a.firstIndex - b.firstIndex;
    })[0] ?? null;
  };

  if (![...roleByKey.values()].includes('Agent')) {
    const agentGroup = pickBestGroup('Agent') ?? sortedGroups[0] ?? null;
    if (agentGroup) { roleByKey.set(agentGroup.key, 'Agent'); usedKeys.add(agentGroup.key); }
  }

  if (![...roleByKey.values()].includes('Customer')) {
    const customerGroup = pickBestGroup('Customer') ?? sortedGroups[1] ?? sortedGroups[0] ?? null;
    if (customerGroup) { roleByKey.set(customerGroup.key, 'Customer'); usedKeys.add(customerGroup.key); }
  }

  remainingGroups().forEach((group) => {
    roleByKey.set(group.key, group.agentScore >= group.customerScore ? 'Agent' : 'Customer');
  });

  return lines.map((line, index) => {
    const explicitRole = getExplicitSpeakerRole(line);
    if (explicitRole) return explicitRole;
    const baseRole = roleByKey.get(getSpeakerGroupKey(line, index)) ?? (index === 0 ? 'Agent' : 'Customer');
    const text = pickFullTranscriptionText(line);
    const { agent, customer } = scoreLineForRole(text, index, context);
    if (agent >= customer + 3) return 'Agent';
    if (customer >= agent + 3) return 'Customer';
    return baseRole;
  });
};

const buildTranscriptSegments = (lines: TranscriptionLine[], roles: ConversationRole[], duration: number): TranscriptSegment[] => {
  if (lines.length === 0) return [];

  const baseSegments = lines.map((line, index) => {
    const range = getTranscriptTimeRange(line);
    return {
      ...line,
      role: roles[index] || 'Customer',
      textValue: pickFullTranscriptionText(line),
      startSec: range.start ?? -1,
      endSec: range.end ?? -1,
      canSeek: range.start !== null || range.end !== null,
    };
  });

  return baseSegments.map((segment, index) => {
    let startSec = segment.startSec;
    let endSec = segment.endSec;

    if (startSec < 0) {
      const previous = baseSegments[index - 1];
      startSec = previous ? Math.max(0, previous.endSec >= 0 ? previous.endSec : previous.startSec >= 0 ? previous.startSec : 0) : 0;
    }

    if (endSec < 0) {
      const nextWithStart = baseSegments.slice(index + 1).find((item) => item.startSec >= 0);
      if (nextWithStart) endSec = nextWithStart.startSec;
      else if (duration > 0) endSec = duration;
      else endSec = startSec + 4;
    }

    if (endSec <= startSec) {
      const nextWithStart = baseSegments.slice(index + 1).find((item) => item.startSec > startSec);
      endSec = nextWithStart ? nextWithStart.startSec : Math.max(startSec + 0.8, duration || startSec + 4);
    }

    return { ...segment, startSec, endSec, canSeek: Number.isFinite(startSec) && startSec >= 0 };
  });
};

const findActiveTranscriptIndex = (segments: TranscriptSegment[], currentTime: number): number => {
  if (segments.length === 0) return -1;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (currentTime >= Math.max(0, segment.startSec - 0.15) && currentTime < segment.endSec) return index;
  }

  let nearestIndex = -1;
  for (let index = 0; index < segments.length; index += 1) {
    if (currentTime >= segments[index].startSec) nearestIndex = index;
    else break;
  }

  return nearestIndex;
};

const collectBrandKeywords = (
  analysis: AnalysisData | null,
  enhancedAnalysis: EnhancedAnalysis | null,
  transcriptText: string
): string[] => {
  if (!analysis && !enhancedAnalysis) return [];

  const candidates = new Set<string>();

  const addCandidate = (value?: string) => {
    const normalized = (value || '').trim();
    if (normalized) candidates.add(normalized);
  };

  addCandidate(analysis?.brand_name);
  enhancedAnalysis?.entities?.brands?.forEach((brand) => addCandidate(brand));

  if (!transcriptText.trim()) return Array.from(candidates);

  const lowerTranscript = transcriptText.toLowerCase();
  const matched: string[] = [];

  candidates.forEach((brand) => {
    const lowerBrand = brand.toLowerCase();
    const escaped = lowerBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundaryRegex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    const isMatched = boundaryRegex.test(lowerTranscript) || lowerTranscript.includes(lowerBrand);
    if (isMatched) matched.push(brand);
  });

  return matched;
};

const isUnknownLabel = (value?: string | null): boolean => {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || normalized === 'unknown' || normalized === 'n/a' || normalized === '-';
};

const normalizeKeywordList = (keywords: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const kw of keywords) {
    const normalized = String(kw || '').trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
};

const sanitizeSummaryPoints = (points: unknown): string[] => {
  if (!Array.isArray(points)) return [];
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const item of points) {
    const text = String(item || '').trim().replace(/\s+/g, ' ');
    if (!text) continue;
    if (text.length < 8 || text.length > 220) continue;
    const weird = (text.match(/[^\u0E00-\u0E7Fa-zA-Z0-9\s\.,!?\-()'":;/%]/g) || []).length;
    if (weird / Math.max(text.length, 1) > 0.04) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(text);
    if (cleaned.length >= 4) break;
  }
  return cleaned;
};

const extractPhoneFromFilename = (filename?: string): string | null => {
  if (!filename) return null;
  const basename = filename.replace(/\.[^.]+$/, '');
  const pattern = /(?<!\d)(0(?:6|8|9)\d(?:[\s._-]?\d){7})(?!\d)/g;
  const positiveContext = /(phone|tel|mobile|customer|cust|ลูกค้า|เบอร์)/i;
  const negativeContext = /(agent|id|reg|registration|order|serial|sn|inv|invoice|date|time|timestamp|เวลา)/i;

  let bestPhone: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const match of basename.matchAll(pattern)) {
    const raw = match[0] || '';
    const digits = raw.replace(/\D/g, '');
    if (!/^0[689]\d{8}$/.test(digits)) continue;

    const index = match.index ?? 0;
    const contextStart = Math.max(0, index - 20);
    const contextEnd = Math.min(basename.length, index + raw.length + 20);
    const context = basename.slice(contextStart, contextEnd);

    let score = 0;
    if (positiveContext.test(context)) score += 3;
    if (negativeContext.test(context)) score -= 3;

    if (score > bestScore) {
      bestScore = score;
      bestPhone = digits;
    }
  }

  return bestPhone;
};

const extractAgentIdFromFilename = (filename?: string): string | null => {
  if (!filename) return null;
  const matches = filename.match(/(?:^|[^0-9])([12]\d{2})(?!\d)/g) || [];
  for (const raw of matches) {
    const id = raw.replace(/\D/g, '');
    if (/^[12]\d{2}$/.test(id)) return id;
  }
  return null;
};

export default function FileAnalysisDetail() {
  const router = useRouter();
  const params = useParams();
  const fileId = params.id as string;

  const [fileData, setFileData] = useState<FileData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [enhancedAnalysis, setEnhancedAnalysis] = useState<EnhancedAnalysis | null>(null);
  const [loadingEnhanced, setLoadingEnhanced] = useState(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const transcriptItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lastFocusedTranscriptIndexRef = useRef(-1);

  const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : 'Unknown error';

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/audio/detail/${fileId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFileData(data.file);
      if (data.analysis) {
        const rawSummary = String(data.analysis.summary ?? data.analysis.summary_text ?? '').trim();
        const rawTranscript = String(data.analysis.full_transcript ?? '').trim();
        const summaryLooksLikeTranscript = !!rawSummary && (
          (rawTranscript && rawSummary === rawTranscript) || rawSummary.length > 700
        );
        const normalizedSummaryPoints = Array.isArray(data.analysis.summary_points)
          ? data.analysis.summary_points
              .map((p: unknown) => String(p || '').trim())
              .filter((p: string) => p.length > 0 && p.length <= 280)
          : [];

        const normalizedAnalysis = {
          ...data.analysis,
          summary: summaryLooksLikeTranscript ? '' : rawSummary,
          summary_points: normalizedSummaryPoints,
          transcription: normalizeTranscription(data.analysis),
        };
        setAnalysis(normalizedAnalysis);
      } else {
        setAnalysis(null);
      }

      // Fetch enhanced analysis after main data is loaded
      if (data.analysis) {
        fetchEnhancedAnalysis(fileId);
      }
    } catch {
      setError('ไม่สามารถโหลดข้อมูลไฟล์ได้ — ตรวจสอบว่า Backend กำลังทำงาน');
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchDetail();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [fetchDetail]);

  const fetchEnhancedAnalysis = async (fileId: string) => {
    setLoadingEnhanced(true);
    try {
      const [entitiesRes, keywordsRes, topicRes, qaRes, csatRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/ai/entities/${fileId}`),
        fetch(`${API_BASE}/api/v1/ai/keywords/${fileId}`),
        fetch(`${API_BASE}/api/v1/ai/topic/${fileId}`),
        fetch(`${API_BASE}/api/v1/ai/qa-score/${fileId}`),
        fetch(`${API_BASE}/api/v1/ai/csat/${fileId}`)
      ]);

      const parseSettledJson = async (result: PromiseSettledResult<Response>, fallback: Record<string, unknown>) => {
        if (result.status !== 'fulfilled') return fallback;
        if (!result.value.ok) return fallback;
        return result.value.json().catch(() => fallback);
      };

      const [entities, keywords, topic, qaScore, csat] = await Promise.all([
        parseSettledJson(entitiesRes, { entities: { brands: ['-'], products: ['-'], order_numbers: ['-'], amounts: [] } }),
        parseSettledJson(keywordsRes, { keywords: { keywords: ['-'], categories: {}, sentiment_indicators: ['-'], urgency_level: '-' } }),
        parseSettledJson(topicRes, { topic: { primary_category: '-', confidence: 0, secondary_categories: ['-'] } }),
        parseSettledJson(qaRes, { qa_score: { overall_score: 0, grade: '-', criteria: {}, strengths: ['-'], areas_for_improvement: ['-'] } }),
        parseSettledJson(csatRes, { csat: { csat_score: 0, reasoning: '-' } })
      ]);

      const entitiesPayload = (entities?.entities || entities || {}) as Record<string, unknown>;
      const keywordsPayload = (keywords?.keywords || keywords || {}) as Record<string, unknown>;
      const topicPayload = (topic?.topic || topic || {}) as Record<string, unknown>;
      const qaPayload = (qaScore?.qa_score || qaScore || {}) as Record<string, unknown>;
      const csatPayload = (csat?.csat || csat || {}) as Record<string, unknown>;

      const normalizeCategories = (raw: unknown): Record<string, { matched: string[]; count?: number }> => {
        if (!raw || typeof raw !== 'object') return { general: { matched: ['-'], count: 1 } };
        const entries = Object.entries(raw as Record<string, unknown>);
        const mapped: Record<string, { matched: string[]; count?: number }> = {};
        for (const [key, value] of entries) {
          if (Array.isArray(value)) {
            mapped[key] = { matched: value.map((x) => String(x)), count: value.length };
            continue;
          }
          if (value && typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            const matched = Array.isArray(obj.matched) ? obj.matched.map((x) => String(x)) : [];
            const count = typeof obj.count === 'number' ? obj.count : matched.length;
            mapped[key] = { matched: matched.length > 0 ? matched : ['-'], count };
          }
        }
        return Object.keys(mapped).length > 0 ? mapped : { general: { matched: ['-'], count: 1 } };
      };

      const normalizeAmounts = (raw: unknown): { value: number; currency: string }[] => {
        if (!Array.isArray(raw)) return [];
        return raw
          .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
          .map((item) => {
            const value = typeof item.value === 'number'
              ? item.value
              : Number(String(item.value ?? '').replace(/,/g, ''));
            const currency = typeof item.currency === 'string' && item.currency.trim()
              ? item.currency
              : 'THB';
            return { value, currency };
          })
          .filter((item) => Number.isFinite(item.value));
      };

      setEnhancedAnalysis({
        entities: {
          brands: Array.isArray(entitiesPayload.brands) ? entitiesPayload.brands as string[] : [],
          products: Array.isArray(entitiesPayload.products) ? entitiesPayload.products as string[] : [],
          orders: Array.isArray(entitiesPayload.orders)
            ? entitiesPayload.orders as string[]
            : (Array.isArray(entitiesPayload.order_numbers) ? entitiesPayload.order_numbers as string[] : []),
          amounts: normalizeAmounts(entitiesPayload.amounts),
        },
        keywords: {
          keywords: Array.isArray(keywordsPayload.keywords) ? keywordsPayload.keywords as string[] : [],
          categories: normalizeCategories(keywordsPayload.categories),
          sentiment_indicators: Array.isArray(keywordsPayload.sentiment_indicators) ? keywordsPayload.sentiment_indicators as string[] : [],
          urgency_level: typeof keywordsPayload.urgency_level === 'string' ? keywordsPayload.urgency_level : '-',
        },
        topic: {
          primary_category: typeof topicPayload.primary_category === 'string' ? topicPayload.primary_category : 'Unknown',
          secondary_categories: Array.isArray(topicPayload.secondary_categories) ? topicPayload.secondary_categories as string[] : [],
          confidence: typeof topicPayload.confidence === 'number' ? topicPayload.confidence : 0,
        },
        qaScore: {
          overall_score: typeof qaPayload.overall_score === 'number' ? qaPayload.overall_score : 0,
          grade: typeof qaPayload.grade === 'string' ? qaPayload.grade : 'N/A',
          criteria: (qaPayload.criteria as Record<string, { score: number; max_score: number }>) || {},
          strengths: Array.isArray(qaPayload.strengths) ? qaPayload.strengths as string[] : [],
          areas_for_improvement: Array.isArray(qaPayload.areas_for_improvement) ? qaPayload.areas_for_improvement as string[] : [],
        },
        csat: {
          csat_score: typeof csatPayload.csat_score === 'number' ? csatPayload.csat_score : 0,
          reasoning: typeof csatPayload.reasoning === 'string' ? csatPayload.reasoning : 'No data',
        },
      });
    } catch (error) {
      console.error('Failed to fetch enhanced analysis:', error);
      setEnhancedAnalysis({
        entities: { brands: ['-'], products: ['-'], orders: ['-'], amounts: [] },
        keywords: {
          keywords: ['-'],
          categories: { general: { matched: ['-'], count: 1 } },
          sentiment_indicators: ['-'],
          urgency_level: '-',
        },
        topic: { primary_category: '-', secondary_categories: ['-'], confidence: 0 },
        qaScore: {
          overall_score: 0,
          grade: '-',
          criteria: {},
          strengths: ['-'],
          areas_for_improvement: ['-'],
        },
        csat: { csat_score: 0, reasoning: '-' },
      });
    } finally {
      setLoadingEnhanced(false);
    }
  };

  // ── Audio Player ──
  const initAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(`${API_BASE}/api/v1/audio/play/${fileId}`);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
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

  const seekToTime = (seconds: number) => {
    const audio = initAudio();
    const boundedTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    audio.currentTime = boundedTime;
    setCurrentTime(boundedTime);
  };

  const seekAudio = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = initAudio();
    const bar = progressRef.current;
    if (!bar || !audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    seekToTime(pct * audio.duration);
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '00:00';
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const fullTranscript = analysis?.transcription
    ?.map((line) => pickFullTranscriptionText(line))
    .filter(Boolean)
    .join(' ')
    .trim() || '';

  const brandKeywords = collectBrandKeywords(analysis, enhancedAnalysis, fullTranscript);
  const primaryBrand = !isUnknownLabel(analysis?.brand_name)
    ? String(analysis?.brand_name)
    : (brandKeywords[0] || '-');

  const parsedPhoneFromFilename = extractPhoneFromFilename(fileData?.original_filename);
  const parsedAgentIdFromFilename = extractAgentIdFromFilename(fileData?.original_filename);
  const displayPhone = parsedPhoneFromFilename || fileData?.customer_phone || analysis?.customer_phone || '-';
  const displayAgentId = parsedAgentIdFromFilename || analysis?.agent_id || fileData?.agent_id || '-';
  const transcriptionRoles = useMemo(
    () => resolveTranscriptionRoles(analysis?.transcription || [], {
      agentId: displayAgentId,
      agentName: analysis?.agent_name || fileData?.agent_name || '',
      customerPhone: displayPhone,
    }),
    [analysis?.agent_name, analysis?.transcription, displayAgentId, displayPhone, fileData?.agent_name]
  );
  const transcriptSegments = useMemo(
    () => buildTranscriptSegments(analysis?.transcription || [], transcriptionRoles, duration),
    [analysis?.transcription, duration, transcriptionRoles]
  );
  const activeTranscriptIndex = useMemo(
    () => findActiveTranscriptIndex(transcriptSegments, currentTime),
    [currentTime, transcriptSegments]
  );
  const currentFileRouteId = String(fileData?.file_id || analysis?.file_id || fileId || '');
  const customerPhoneForWarranty = String(parsedPhoneFromFilename || fileData?.customer_phone || analysis?.customer_phone || '').trim();
  const warrantyAutoId = currentFileRouteId
    .substring(0, 8)
    .toUpperCase();
  const customerWarrantyHref = customerPhoneForWarranty && currentFileRouteId
    ? `/customers/CUST-${customerPhoneForWarranty}/warranty/${currentFileRouteId}`
    : '#';


  useEffect(() => {
    if (!isPlaying || activeTranscriptIndex < 0) return;
    if (lastFocusedTranscriptIndexRef.current === activeTranscriptIndex) return;

    transcriptItemRefs.current[activeTranscriptIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
    lastFocusedTranscriptIndexRef.current = activeTranscriptIndex;
  }, [activeTranscriptIndex, isPlaying]);

  useEffect(() => {
    if (activeTranscriptIndex < 0) lastFocusedTranscriptIndexRef.current = -1;
  }, [activeTranscriptIndex]);

  const enhancedCategoryKeywords = Object.values(enhancedAnalysis?.keywords?.categories || {})
    .flatMap((item) => Array.isArray(item?.matched) ? item.matched : []);

  const allKeywords = normalizeKeywordList([
    ...(analysis?.keywords || []),
    ...(enhancedAnalysis?.keywords?.keywords || []),
    ...enhancedCategoryKeywords,
  ]);

  const brandTokenSet = new Set(brandKeywords.map((b) => b.toLowerCase()));
  const conversationKeywords = allKeywords
    .filter((kw) => {
      const lower = kw.toLowerCase();
      if (brandTokenSet.has(lower)) return false;
      if (lower.length <= 1) return false;
      return true;
    })
    .slice(0, 16);

  const safeSummaryPoints = sanitizeSummaryPoints(analysis?.summary_points);
  const safeSummaryText = String(analysis?.summary || '').trim();
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── AI re-analysis ──
  const triggerAnalysis = async () => {
    setAnalyzing(true);
    setAnalyzingProgress(0);
    setError(null);
    try {
      // Step 1: Start analysis with retry logic
      console.log('[Analysis] Starting analysis for file:', fileId);
      let taskId: string | null = null;
      let startAttempts = 0;
      const maxStartAttempts = 5;

      while (!taskId && startAttempts < maxStartAttempts) {
        try {
          const res = await Promise.race([
            fetch(`${API_BASE}/api/v1/ai/analyze/${fileId}`, { method: 'POST' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Start request timeout (30s)')), 30000))
          ]) as Response;

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${res.status}`);
          }
          const data = await res.json();
          taskId = data.task_id;
          if (!taskId) throw new Error('No task_id in response');
        } catch (err: unknown) {
          startAttempts++;
          console.warn(`[Analysis] Start attempt ${startAttempts}/${maxStartAttempts} failed:`, getErrorMessage(err));
          if (startAttempts < maxStartAttempts) await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!taskId) throw new Error('Failed to start analysis after multiple attempts');

      await logClientActivity({
        action: 'AUDIO_ANALYSIS_REQUESTED',
        target: fileId,
        routePath: `/files/${fileId}`,
        metadata: { source: 'file-detail-reanalyze' },
      });

      console.log('[Analysis] ✓ Started task:', taskId);

      // Step 2: Poll for status (1200 attempts × 1s = 20 minutes max)
      const maxAttempts = 1200;
      const pollInterval = 1000;
      let failureCount = 0;
      const maxFailures = 5;
      let lastStatus = 'unknown';

      for (let attempts = 0; attempts < maxAttempts; attempts++) {
        if (attempts > 0) {
          await new Promise(r => setTimeout(r, pollInterval));
        }

        const progress = Math.min(95, Math.round((attempts / maxAttempts) * 100));
        setAnalyzingProgress(progress);

        try {
          const sr = await Promise.race([
            fetch(`${API_BASE}/api/v1/ai/status/${taskId}`),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Status check timeout')), 10000))
          ]) as Response;

          if (!sr.ok) {
            failureCount++;
            console.warn(`[Analysis] Status HTTP ${sr.status} (failure ${failureCount}/${maxFailures})`);
            if (failureCount >= maxFailures) {
              throw new Error(`Server error: HTTP ${sr.status} - backend may be unavailable`);
            }
            continue;
          }

          failureCount = 0;
          const sd = await sr.json();

          if (attempts % 5 === 0 || sd.status !== lastStatus) {
            console.log(`[Analysis] Attempt ${attempts + 1}/${maxAttempts} | Status: ${sd.status} | Progress: ${progress}%`);
            if (sd.message) console.log(`[Analysis] Message: ${sd.message}`);
          }

          lastStatus = sd.status || lastStatus;

          if (sd.status === 'completed' || sd.status === 'done' || sd.status === 'success') {
            console.log('[Analysis] ✓ Completed! Refreshing data...');
            setAnalyzingProgress(100);
            await new Promise(r => setTimeout(r, 800));
            await fetchDetail();
            setAnalyzing(false);
            return;
          }

          if (sd.status === 'failed' || sd.status === 'error') {
            throw new Error(sd.error_message || 'Analysis failed');
          }

          if (sd.status === 'not_found' || sd.status === 'invalid') {
            throw new Error('Task expired or not found');
          }
        } catch (err: unknown) {
          failureCount++;
          console.warn(`[Analysis] Poll error (${failureCount}/${maxFailures}):`, getErrorMessage(err));

          if (failureCount >= maxFailures) {
            throw new Error('Network error: Unable to connect to server. Check if backend is running.');
          }
        }
      }

      throw new Error('Analysis timeout after 20 minutes. The file may be too large or backend is very slow. Please try again or check backend logs.');
    } catch (err: unknown) {
      console.error('[Analysis] Error:', err);
      setError(getErrorMessage(err) || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
      setAnalyzingProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!confirm('ต้องการลบไฟล์นี้จริงหรือไม่?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/v1/audio/delete/${fileId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await logClientActivity({
        action: 'AUDIO_FILE_DELETED',
        target: fileId,
        routePath: `/files/${fileId}`,
        metadata: { source: 'file-detail-delete' },
      });

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
      <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
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
              <div className="flex flex-col items-end mr-2">
                <button onClick={triggerAnalysis} disabled={analyzing}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50">
                  <RefreshCw size={16} className={`text-slate-400 ${analyzing ? 'animate-spin' : ''}`} />
                  <span>{analyzing ? 'กำลังวิเคราะห์...' : 're-Analyze'}</span>
                </button>
                {analyzing && (
                  <div className="w-32 bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-500 ease-out"
                      style={{ width: `${analyzingProgress}%` }}
                    />
                  </div>
                )}
              </div>
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

              {analyzing ? (
                <div className="max-w-md mx-auto">
                  <div className="bg-white rounded-full h-3 mb-3 overflow-hidden border border-amber-200">
                    <div
                      className="bg-blue-600 h-full transition-all duration-500 ease-out"
                      style={{ width: `${analyzingProgress}%` }}
                    />
                  </div>
                  <p className="text-sm font-bold text-blue-700">{analyzingProgress}%</p>
                  <p className="text-xs text-amber-700 mt-2">กำลังวิเคราะห์... กรุณารอสักครู่</p>
                </div>
              ) : (
                <button onClick={triggerAnalysis} disabled={analyzing}
                  className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50">
                  เริ่มวิเคราะห์ด้วย AI
                </button>
              )}
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
                  {safeSummaryPoints.length > 0 ? (
                    <ul className="space-y-3.5 text-slate-600 text-sm list-disc pl-5 marker:text-slate-300">
                      {safeSummaryPoints.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm">{safeSummaryText || '-'}</p>
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
                  <p className="text-[10px] text-slate-400 mb-5 ml-9">ถอดคำโดย Whisper Large V3 | จับคู่ Agent / Customer จาก speaker data + บริบทของประโยค และกด transcript เพื่อกระโดดไปช่วงเสียงนั้นได้</p>

                  {analysis.transcription && analysis.transcription.length > 0 ? (
                    <div className="space-y-5">
                      {/* Agent / Customer Labels Header */}
                      <div className="flex items-center gap-3 bg-linear-to-r from-blue-50 to-emerald-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                          <span className="text-xs font-bold text-blue-700">Agent</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                          <span className="text-xs font-bold text-emerald-700">Customer</span>
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2">Full Transcript (No Cut)</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap wrap-break-word">{fullTranscript || '-'}</p>
                      </div>

                      {transcriptSegments.map((segment, idx) => {
                        const isAgent = segment.role === 'Agent';
                        const isActive = idx === activeTranscriptIndex;
                        const timeText = formatTime(segment.startSec);

                        return (
                          <div
                            key={idx}
                            ref={(node) => {
                              transcriptItemRefs.current[idx] = node;
                            }}
                            className={`rounded-2xl p-2 transition-all duration-200 ${isActive ? 'bg-blue-50/70 ring-2 ring-blue-100 shadow-sm' : ''}`}
                          >
                            <div className="mb-1.5 flex items-center gap-2">
                              <span className={`text-xs font-bold ${isAgent ? 'text-blue-700' : 'text-emerald-700'}`}>
                                {segment.role}
                              </span>
                              <span className={`rounded px-2 py-0.5 text-[10px] ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{timeText}</span>
                              {isActive && <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Now Playing</span>}
                            </div>
                            <button
                              type="button"
                              onClick={() => segment.canSeek && seekToTime(segment.startSec)}
                              className={`w-full rounded-2xl rounded-tl-sm border p-4 text-left text-sm text-slate-700 transition-all whitespace-pre-wrap wrap-break-word ${segment.canSeek ? 'cursor-pointer' : 'cursor-default'} ${isActive ? 'border-blue-300 shadow-[0_0_0_1px_rgba(59,130,246,0.08)]' : ''} ${isAgent ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'}`}
                            >
                              {segment.textValue || '-'}
                            </button>
                          </div>
                        );
                      })}
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
                        {displayPhone}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Agent ID</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {displayAgentId}
                        {(analysis?.agent_name || fileData?.agent_name) && (
                          <span className="text-slate-500 font-normal"> ({analysis?.agent_name || fileData?.agent_name})</span>
                        )}
                      </p>
                    </div>

                    {/* From AI (Brand/Product detected from transcript) */}
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Brand</p>
                      <p className="text-sm font-semibold text-slate-800">{primaryBrand}</p>
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
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Warranty Information</p>
                      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4 shadow-sm">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Serial No.</p>
                            <p className="mt-1 text-xs font-bold text-slate-800 font-mono tracking-tight break-all">{analysis?.serial_no || '-'}</p>
                          </div>
                          <div className="rounded-lg border border-blue-200 bg-blue-600 p-3 shadow-sm">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-100">Auto ID</p>
                            <a
                              href={customerWarrantyHref}
                              className="mt-1 inline-flex items-center rounded-md bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white transition-all hover:bg-white hover:text-blue-700 font-mono"
                            >
                              AUTO-{warrantyAutoId}
                            </a>
                          </div>
                          <div className="rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Start Date</p>
                            <p className="mt-1 text-xs font-bold text-slate-800">{analysis?.warranty_start_date || '-'}</p>
                          </div>
                          <div className="rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Registration Date</p>
                            <p className="mt-1 text-xs font-bold text-slate-800">{analysis?.registrationDate || '-'}</p>
                          </div>
                          <div className="rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">End Date</p>
                            <p className="mt-1 text-xs font-bold text-slate-800">{analysis?.warranty_end_date || '-'}</p>
                          </div>
                          <div className="rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Expiry Date</p>
                            <p className="mt-1 text-xs font-bold text-slate-800">{analysis?.expiry_date_of_warranty || '-'}</p>
                          </div>
                        </div>
                      </div>
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
                      <p className="text-sm text-blue-100 leading-relaxed whitespace-pre-wrap">{analysis.key_insights}</p>
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



                {/* ── Enhanced Analysis Section ── */}
                {enhancedAnalysis && (
                  <div className="enhanced-analysis-grid">
                    {/* QA Score Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                      <div className="flex items-center space-x-2 mb-4">
                        <Star size={18} className="text-yellow-600" />
                        <h3 className="text-sm font-bold text-slate-800">⭐ คะแนนคุณภาพ Agent</h3>
                      </div>
                      <div className="qa-score-display">
                        <div className="qa-overall mb-4">
                          <div className="score-circle">
                            {enhancedAnalysis.qaScore.overall_score?.toFixed(1)}
                          </div>
                          <div className="grade">{enhancedAnalysis.qaScore.grade}</div>
                        </div>

                        <div className="qa-criteria space-y-2">
                          {Object.entries(enhancedAnalysis.qaScore.criteria || {}).map(([criteria, data]) => {
                            const th: Record<string, string> = {
                              greeting: 'การทักทาย',
                              politeness: 'ความสุภาพ',
                              listening: 'การรับฟัง',
                              resolution: 'การแก้ไขปัญหา',
                              closing: 'การกล่าวปิด',
                              compliance: 'ความถูกต้องตามกฎ'
                            };
                            const thLabel = th[criteria.toLowerCase()];
                            return (
                              <div key={criteria} className="criterion">
                                <span className="criterion-name">
                                  <span className="text-xs font-medium">{criteria}</span>
                                  {thLabel && <span className="block text-[10px] text-slate-400 leading-tight">{thLabel}</span>}
                                </span>
                                <div className="criterion-bar">
                                  <div
                                    className="criterion-fill"
                                    style={{ width: `${(data.score / (data.max_score || 10)) * 100}%` }}
                                  />
                                </div>
                                <span className="criterion-score text-xs font-bold">{data.score}/{data.max_score || 10}</span>
                              </div>
                            );
                          })}
                        </div>

                        {enhancedAnalysis.qaScore.strengths?.length > 0 && (
                          <div className="qa-section mt-4 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-emerald-600 mb-2">✅ จุดแข็ง</h4>
                            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                              {enhancedAnalysis.qaScore.strengths.map((strength: string, idx: number) => (
                                <li key={idx}>{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {enhancedAnalysis.qaScore.areas_for_improvement?.length > 0 && (
                          <div className="qa-section mt-3 pt-3 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-amber-600 mb-2">📈 ควรปรับปรุง</h4>
                            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                              {enhancedAnalysis.qaScore.areas_for_improvement.map((area: string, idx: number) => (
                                <li key={idx}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CSAT Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                      <div className="flex items-center space-x-2 mb-4">
                        <Smile size={18} className="text-green-600" />
                        <h3 className="text-sm font-bold text-slate-800">😊 ความพึงพอใจลูกค้า</h3>
                      </div>
                      <div className="csat-display">
                        <div className="csat-score mb-3">
                          <div className="csat-circle">
                            {enhancedAnalysis.csat.csat_score}/5
                          </div>
                          <div className="csat-label text-sm font-bold mt-2">
                            {enhancedAnalysis.csat.csat_score >= 4 ? 'พึงพอใจ' :
                             enhancedAnalysis.csat.csat_score >= 3 ? 'ปานกลาง' : 'ไม่พึงพอใจ'}
                          </div>
                        </div>
                        <div className="csat-reason text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                          {enhancedAnalysis.csat.reasoning}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading Enhanced Analysis */}
                {loadingEnhanced && (
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
                    <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">กำลังโหลดข้อมูลวิเคราะห์ขั้นสูง...</p>
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
