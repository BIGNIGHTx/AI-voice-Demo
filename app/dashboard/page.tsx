'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Folder,
  MoreHorizontal,
  FileAudio,
  Smile,
  Meh,
  Frown,
  CheckCircle2,
  RefreshCw,
  Building2,
  AlertCircle,
  Loader2,
  TriangleAlert,
  LayoutDashboard,
  Flame,
  BarChart2
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const BRAND_TONES = [
  {
    badge: 'border-orange-200 bg-orange-100 text-orange-700',
    bar: 'from-orange-400 to-amber-500'
  },
  {
    badge: 'border-sky-200 bg-sky-100 text-sky-700',
    bar: 'from-sky-400 to-blue-500'
  },
  {
    badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    bar: 'from-emerald-400 to-teal-500'
  },
  {
    badge: 'border-rose-200 bg-rose-100 text-rose-700',
    bar: 'from-rose-400 to-pink-500'
  },
  {
    badge: 'border-violet-200 bg-violet-100 text-violet-700',
    bar: 'from-violet-400 to-indigo-500'
  }
];

type FilterType = 'Day' | 'Month' | 'Year';

interface AudioFileRow {
  file_id: string;
  sentiment: string;
  brand: string;
  status: string;
  date: string;
  agent_name: string;
  topic?: string;
  qa_score?: number;
  csat_score?: number;
}

interface TopicRow {
  name: string;
  value: number;
}

interface TopicFileGroup extends TopicRow {
  files: AudioFileRow[];
}

interface KeywordFrequencyRow {
  keyword: string;
  count: number;
  percentage: number;
}

interface AgentRow {
  agent_id: string;
  agent_name?: string;
  avg_qa_score: number;
  avg_csat_score: number;
  total_calls: number;
  positive_calls?: number;
  negative_calls?: number;
  resolution_rate?: number;
  avg_handling_time?: number;
}

interface CaseScoreRow {
  qa?: number;
  csat?: number;
  loading?: boolean;
}

interface BrandRow {
  brand_name: string;
  total_mentions: number;
  positive_mentions: number;
  negative_mentions: number;
  avg_sentiment_score?: number;
}

interface EndpointStatus {
  ok: boolean;
  statusCode?: number;
  message?: string;
}

type EndpointStatusMap = Record<string, EndpointStatus>;

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

const toNum = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

const toOptionalNum = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/,/g, '');
    if (!cleaned || ['-', 'n/a', 'na', 'null', 'undefined'].includes(cleaned.toLowerCase())) return undefined;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const isRealScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const AGENT_CASE_SCORE_CACHE_KEY = 'dashboard-agent-case-scores-v3';

const readAgentCaseScoreCache = (): Record<string, CaseScoreRow> => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.sessionStorage.getItem(AGENT_CASE_SCORE_CACHE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return {};

    return Object.entries(parsed).reduce<Record<string, CaseScoreRow>>((acc, [fileId, value]) => {
      if (!isObject(value)) return acc;
      acc[fileId] = {
        qa: toOptionalNum(value.qa),
        csat: toOptionalNum(value.csat),
        loading: false
      };
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const writeAgentCaseScoreCache = (scores: Record<string, CaseScoreRow>) => {
  if (typeof window === 'undefined') return;

  const serializable = Object.fromEntries(
    Object.entries(scores)
      .filter(([, score]) => score.qa !== undefined || score.csat !== undefined)
      .map(([fileId, score]) => [fileId, { qa: score.qa, csat: score.csat }])
  );

  try {
    window.sessionStorage.setItem(AGENT_CASE_SCORE_CACHE_KEY, JSON.stringify(serializable));
  } catch {
    // Cache is only for avoiding repeat spinners on Dashboard navigation.
  }
};

const compactText = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[\s\t\n\r]+/g, ' ')
    .trim();

const TOPIC_GROUP_RULES: Array<{ label: string; includes: string[] }> = [
  { label: 'คืนเงิน/ขอเงินคืน', includes: ['คืนเงิน', 'ขอเงินคืน', 'refund'] },
  { label: 'เปลี่ยนสินค้า/เปลี่ยนที่นอน', includes: ['เปลี่ยน', 'เปลี่ยนที่นอน', 'เปลี่ยนสินค้า'] },
  { label: 'รับคืน/คืนสินค้า', includes: ['รับกลับ', 'รับคืน', 'คืนสินค้า', 'รับที่นอนกลับ'] },
  { label: 'จัดส่งสินค้า', includes: ['จัดส่ง', 'ส่งสินค้า', 'การส่งสินค้า', 'delivery', 'ขนส่ง'] },
  { label: 'ประกัน/เงื่อนไข', includes: ['ประกัน', 'รับประกัน', 'เงื่อนไข', 'warranty', 'claim', 'เคลม'] },
  { label: 'ร้องเรียน/ไม่พอใจ', includes: ['ร้องเรียน', 'คอมเพลน', 'ไม่พอใจ', 'complain', 'complaint'] },
  { label: 'แก้ไขปัญหา/ขอความช่วยเหลือ', includes: ['แก้ไข', 'ปัญหา', 'ขอความช่วยเหลือ', 'วิธีแก้ไข'] },
  { label: 'สอบถามข้อมูล', includes: ['สอบถาม', 'อยากทราบ', 'ขอข้อมูล', 'ข้อมูล'] },
];

const mapTopicToGroupLabel = (name: string): string => {
  const text = compactText(name);
  if (!text) return 'ไม่ระบุหัวข้อ';

  for (const rule of TOPIC_GROUP_RULES) {
    if (rule.includes.some((token) => text.includes(compactText(token)))) return rule.label;
  }

  return name;
};

const buildTopicFileGroups = (
  files: AudioFileRow[],
  topicsByFileId: Record<string, string>,
  opts?: { maxGroups?: number }
): TopicFileGroup[] => {
  const maxGroups = opts?.maxGroups ?? 8;
  const groups = new Map<string, TopicFileGroup>();

  files.forEach((file) => {
    const rawTopic = file.topic || topicsByFileId[file.file_id] || '';
    if (!rawTopic) return;

    const name = mapTopicToGroupLabel(rawTopic);
    const existing = groups.get(name) ?? { name, value: 0, files: [] };
    existing.value += 1;
    existing.files.push(file);
    groups.set(name, existing);
  });

  const sorted = Array.from(groups.values())
    .filter((group) => group.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  if (sorted.length <= maxGroups) return sorted;

  const head = sorted.slice(0, maxGroups);
  const rest = sorted.slice(maxGroups);
  const restFiles = rest.flatMap((group) => group.files);
  if (restFiles.length === 0) return head;

  return [
    ...head,
    {
      name: 'อื่นๆ',
      value: restFiles.length,
      files: restFiles
    }
  ];
};

const formatCompactDate = (value: string): string => {
  if (!value) return '-';
  return value.slice(0, 10);
};

const normalizeKeywordToken = (value: unknown): string =>
  String(value || '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const BRAND_KEYWORD_BLOCKLIST = [
  'lotos',
  'midas',
  'bedgear',
  'sealy',
  'dunlopillo',
  'slumberland',
] as const;

const GENERIC_PRODUCT_TOKENS = [
  'mattress',
  'pillow',
  'bed',
  'bedding',
  'ที่นอน',
  'หมอน',
  'ผ้าห่ม',
  'ผ้านวม',
  'ผ้าปู',
] as const;

const tokenizeCompactText = (value: string): string[] =>
  compactText(value)
    .replace(/[^a-z0-9\u0E00-\u0E7F\s-]+/g, ' ')
    .split(/[\s-]+/g)
    .map((token) => token.trim())
    .filter(Boolean);

const buildBrandKeywordStopwords = (files: AudioFileRow[]): Set<string> => {
  const stopwords = new Set<string>();

  BRAND_KEYWORD_BLOCKLIST.forEach((brand) => stopwords.add(compactText(brand)));
  files.forEach((file) => {
    const brand = compactText(file.brand);
    if (!brand || brand === 'unknown' || brand === '-') return;
    stopwords.add(brand);
    tokenizeCompactText(file.brand).forEach((token) => {
      if (token.length >= 3) stopwords.add(token);
    });
  });

  return stopwords;
};

const isBrandKeyword = (keyword: string, brandStopwords: Set<string>): boolean => {
  const normalized = compactText(keyword);
  if (!normalized) return false;
  if (brandStopwords.has(normalized)) return true;

  const tokens = tokenizeCompactText(keyword);
  if (tokens.length === 0) return false;
  if (tokens.length === 1 && brandStopwords.has(tokens[0])) return true;

  // Brand + generic product term (ex. "midas mattress")
  const hasBrand = tokens.some((token) => brandStopwords.has(token));
  if (!hasBrand) return false;
  const remaining = tokens.filter((token) => !brandStopwords.has(token));
  if (remaining.length === 0) return true;
  if (remaining.length <= 2 && remaining.every((token) => GENERIC_PRODUCT_TOKENS.includes(token as typeof GENERIC_PRODUCT_TOKENS[number]))) {
    return true;
  }

  return false;
};

const isUsefulKeyword = (value: string): boolean => {
  const normalized = compactText(value);
  if (!normalized) return false;
  if (['-', 'n/a', 'unknown', 'none', 'null', 'general'].includes(normalized)) return false;
  if (normalized.length <= 1) return false;
  if (/^\d+$/.test(normalized)) return false;
  return true;
};

const PLACEHOLDER_TOPIC_VALUES = new Set(['', '-', 'n/a', 'na', 'unknown', 'none', 'null', 'undefined', 'general']);
const TOPIC_TEXT_KEYS = ['intent', 'topic', 'primary_category', 'category', 'analysis_intent', 'analysis_topic'] as const;
const TOPIC_CONTAINER_KEYS = ['analysis', 'file', 'data', 'result', 'payload'] as const;

const pickTopicText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const text = value.trim();
    if (!PLACEHOLDER_TOPIC_VALUES.has(text.toLowerCase())) return text;
  }
  return '';
};

const extractTopicText = (payload: unknown): string => {
  if (!isObject(payload)) return '';

  const containers: unknown[] = [payload, ...TOPIC_CONTAINER_KEYS.map((key) => payload[key])];
  for (const container of containers) {
    if (!isObject(container)) continue;
    const topic = pickTopicText(...TOPIC_TEXT_KEYS.map((key) => container[key]));
    if (topic) return topic;
  }

  return '';
};

const parseKeywordResponse = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const keywordsNode = (root.keywords && typeof root.keywords === 'object') ? root.keywords as Record<string, unknown> : root;
  const raw = Array.isArray(keywordsNode.keywords) ? keywordsNode.keywords : [];
  return raw
    .map((item) => normalizeKeywordToken(item))
    .filter((item) => isUsefulKeyword(item));
};

const runWithConcurrencyLimit = async <TItem, TResult>(
  items: TItem[],
  limit: number,
  worker: (item: TItem, index: number) => Promise<TResult>
): Promise<TResult[]> => {
  const results: TResult[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await worker(items[idx], idx);
    }
  });

  await Promise.all(runners);
  return results;
};

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
};

const fetchScoreJson = async (url: string, timeoutMs = 30000): Promise<unknown> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

const SCORE_CONTAINER_KEYS = [
  'analysis',
  'analysis_detail',
  'data',
  'result',
  'payload',
  'scores',
  'qa_score',
  'csat',
  'score'
] as const;

const extractScoreByKeys = (
  payload: unknown,
  scoreKeys: readonly string[],
  seen = new WeakSet<object>()
): number | undefined => {
  const primitive = toOptionalNum(payload);
  if (primitive !== undefined) return primitive;
  if (!isObject(payload)) return undefined;
  if (seen.has(payload)) return undefined;
  seen.add(payload);

  for (const key of scoreKeys) {
    const raw = payload[key];
    const value = toOptionalNum(raw);
    if (value !== undefined) return value;
    if (isObject(raw)) {
      const nested = extractScoreByKeys(raw, scoreKeys, seen);
      if (nested !== undefined) return nested;
    }
  }

  for (const key of SCORE_CONTAINER_KEYS) {
    const source = payload[key];
    if (!isObject(source)) continue;
    const nested = extractScoreByKeys(source, scoreKeys, seen);
    if (nested !== undefined) return nested;
  }

  return undefined;
};

const extractQaScore = (payload: unknown): number | undefined =>
  extractScoreByKeys(payload, ['qa_score', 'overall_score', 'quality_score', 'qa', 'score']);

const extractCsatScore = (payload: unknown): number | undefined =>
  extractScoreByKeys(payload, ['csat_score', 'customer_satisfaction_score', 'satisfaction_score', 'csat', 'score']);

const fetchCaseScores = async (file: AudioFileRow, cached?: CaseScoreRow): Promise<{ fileId: string; qa?: number; csat?: number }> => {
  let qa = file.qa_score ?? cached?.qa;
  let csat = file.csat_score ?? cached?.csat;
  const fileId = encodeURIComponent(file.file_id);

  if (qa === undefined || csat === undefined) {
    const [qaResult, csatResult] = await Promise.allSettled([
      qa === undefined
        ? fetchScoreJson(`${API_BASE}/api/v1/ai/qa-score/${fileId}`)
        : Promise.resolve(null),
      csat === undefined
        ? fetchScoreJson(`${API_BASE}/api/v1/ai/csat/${fileId}`)
        : Promise.resolve(null)
    ]);

    if (qa === undefined && qaResult.status === 'fulfilled') {
      qa = extractQaScore(qaResult.value);
    }
    if (csat === undefined && csatResult.status === 'fulfilled') {
      csat = extractCsatScore(csatResult.value);
    }
  }

  if (qa === undefined || csat === undefined) {
    try {
      const detail = await fetchScoreJson(`${API_BASE}/api/v1/audio/detail/${fileId}`, 45000);
      qa = qa ?? extractQaScore(detail);
      csat = csat ?? extractCsatScore(detail);
    } catch {
      // Keep any score already found from the lean endpoints.
    }
  }

  return { fileId: file.file_id, qa, csat };
};

const getErrorMessage = (reason: unknown): string => {
  if (reason instanceof Error) return reason.message;
  return 'Request failed';
};

const extractStatusCode = (message: string): number | undefined => {
  const match = message.match(/HTTP\s+(\d+)/i);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeEndpointStatuses = (
  names: string[],
  results: PromiseSettledResult<unknown>[]
): EndpointStatusMap => {
  const map: EndpointStatusMap = {};
  names.forEach((name, idx) => {
    const result = results[idx];
    if (result.status === 'fulfilled') {
      map[name] = { ok: true };
      return;
    }
    const message = getErrorMessage(result.reason);
    map[name] = {
      ok: false,
      statusCode: extractStatusCode(message),
      message
    };
  });
  return map;
};

const fetchAllAudioFiles = async (): Promise<unknown[]> => {
  const perPage = 100;
  let page = 1;
  let totalPages = 1;
  const items: unknown[] = [];

  while (page <= totalPages) {
    const payload = await fetchJson(`${API_BASE}/api/v1/audio/list?page=${page}&per_page=${perPage}`);
    if (!isObject(payload)) break;
    const pageItems = toArray(payload, ['files', 'items', 'data', 'results']);
    items.push(...pageItems);

    const nextTotal = toNum(payload.total_pages);
    totalPages = nextTotal > 0 ? nextTotal : 1;
    if (page >= totalPages) break;
    page += 1;
  }

  return items;
};

const normalizeAudioFiles = (payload: unknown): AudioFileRow[] =>
  toArray(payload, ['files', 'items', 'data', 'results']).map((item, index) => {
    if (!isObject(item)) {
      return {
        file_id: `file-${index}`,
        sentiment: 'neutral',
        brand: '',
        status: 'UNKNOWN',
        date: '',
        agent_name: 'Unknown Agent',
        topic: undefined,
        qa_score: undefined,
        csat_score: undefined
      };
    }
    return {
      file_id: toText(item.file_id, `file-${index}`),
      sentiment: toText(item.sentiment, 'neutral').toLowerCase(),
      brand: toText(item.brand),
      status: toText(item.status, 'UNKNOWN').toUpperCase(),
      date: toText(item.analyzed_date ?? item.upload_date ?? item.date ?? item.call_datetime ?? item.call_date),
      agent_name: toText(item.agent_name ?? item.agent ?? item.agent_id, 'Unknown Agent'),
      topic: extractTopicText(item) || undefined,
      qa_score: extractQaScore(item),
      csat_score: extractCsatScore(item)
    };
  });

const normalizeAgents = (payload: unknown): AgentRow[] =>
  toArray(payload, ['agent_performance', 'agents', 'data', 'items']).map((item, index) => {
    if (!isObject(item)) {
      return {
        agent_id: `Agent-${index + 1}`,
        avg_qa_score: 0,
        avg_csat_score: 0,
        total_calls: 0
      };
    }
    return {
      agent_id: toText(item.agent_id ?? item.agent_name ?? item.name, `Agent-${index + 1}`),
      agent_name: toText(item.agent_name),
      avg_qa_score: toNum(item.avg_qa_score ?? item.qa_score),
      avg_csat_score: toNum(item.avg_csat_score ?? item.csat_score),
      total_calls: toNum(item.total_calls ?? item.calls ?? item.count),
      positive_calls: toNum(item.positive_calls),
      negative_calls: toNum(item.negative_calls),
      resolution_rate: toNum(item.resolution_rate),
      avg_handling_time: toNum(item.avg_handling_time)
    };
  });

const normalizeBrands = (payload: unknown): BrandRow[] =>
  toArray(payload, ['brand_intelligence', 'brands', 'data', 'items']).map((item, index) => {
    if (!isObject(item)) {
      return {
        brand_name: `Brand ${index + 1}`,
        total_mentions: 0,
        positive_mentions: 0,
        negative_mentions: 0
      };
    }
    const avgScoreRaw = item.avg_sentiment_score ?? item.sentiment_score;
    const avgScore = avgScoreRaw === undefined ? undefined : toNum(avgScoreRaw);
    return {
      brand_name: toText(item.brand_name ?? item.brand ?? item.name, `Brand ${index + 1}`),
      total_mentions: toNum(item.total_mentions ?? item.total ?? item.count),
      positive_mentions: toNum(item.positive_mentions ?? item.positive ?? 0),
      negative_mentions: toNum(item.negative_mentions ?? item.negative ?? 0),
      avg_sentiment_score: avgScore
    };
  });

const getReferenceDate = (type: FilterType, source = new Date()) => {
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth();
  const day = source.getUTCDate();

  if (type === 'Year') return new Date(Date.UTC(year, 0, 1));
  if (type === 'Month') return new Date(Date.UTC(year, month, 1));
  return new Date(Date.UTC(year, month, day));
};

const sameDay = (value: Date, target: Date) =>
  value.getUTCFullYear() === target.getUTCFullYear() &&
  value.getUTCMonth() === target.getUTCMonth() &&
  value.getUTCDate() === target.getUTCDate();

const sameMonth = (value: Date, target: Date) =>
  value.getUTCFullYear() === target.getUTCFullYear() && value.getUTCMonth() === target.getUTCMonth();

const sameYear = (value: Date, target: Date) => value.getUTCFullYear() === target.getUTCFullYear();

const toSafeDate = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateLabel = (value: Date, type: FilterType) => {
  if (type === 'Year') {
    return value.toLocaleDateString('en-US', {
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  if (type === 'Month') {
    return value.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  return value.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
};

const shiftSelectedDate = (value: Date, type: FilterType, delta: number) => {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();

  if (type === 'Year') return new Date(Date.UTC(year + delta, 0, 1));
  if (type === 'Month') return new Date(Date.UTC(year, month + delta, 1));
  return new Date(Date.UTC(year, month, day + delta));
};

export default function DashboardPage() {
  const router = useRouter();
  const [filterType, setFilterType] = useState<FilterType>('Day');
  const [selectedDate, setSelectedDate] = useState(() => getReferenceDate('Day'));

  const [audioFiles, setAudioFiles] = useState<AudioFileRow[]>([]);
  const [, setAgentPerformance] = useState<AgentRow[]>([]);
  const [, setBrandIntelligence] = useState<BrandRow[]>([]);
  const [topicByFileId, setTopicByFileId] = useState<Record<string, string>>({});
  const [selectedTopicName, setSelectedTopicName] = useState<string | null>(null);

  const [keywordFrequency, setKeywordFrequency] = useState<KeywordFrequencyRow[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywordSampleCount, setKeywordSampleCount] = useState(0);
  const keywordCacheRef = useRef<Map<string, string[]>>(new Map());
  const [caseScores, setCaseScores] = useState<Record<string, CaseScoreRow>>(() => readAgentCaseScoreCache());
  const caseScoresRef = useRef<Record<string, CaseScoreRow>>({});
  const requestedCaseScoreIdsRef = useRef<Set<string>>(new Set());
  const requestedTopicIdsRef = useRef<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointStatus, setEndpointStatus] = useState<EndpointStatusMap>({});
  
  const [isRefreshingTable, setIsRefreshingTable] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    caseScoresRef.current = caseScores;
  }, [caseScores]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const endpointNames = [
          '/api/v1/audio/list',
          '/api/v1/analytics/agent-performance',
          '/api/v1/analytics/brand-intelligence',
          '/api/v1/analytics/topic-distribution'
        ];

        const [filesResult, agentResult, brandResult, topicResult] = await Promise.allSettled([
          fetchAllAudioFiles(),
          fetchJson(`${API_BASE}/api/v1/analytics/agent-performance`),
          fetchJson(`${API_BASE}/api/v1/analytics/brand-intelligence`),
          fetchJson(`${API_BASE}/api/v1/analytics/topic-distribution`)
        ]);

        setEndpointStatus(normalizeEndpointStatuses(endpointNames, [filesResult, agentResult, brandResult, topicResult]));

        const allFiles = filesResult.status === 'fulfilled' ? filesResult.value : [];
        const normalizedFiles = normalizeAudioFiles({ files: allFiles });
        setAudioFiles(normalizedFiles);

        setAgentPerformance(normalizeAgents(agentResult.status === 'fulfilled' ? agentResult.value : []));
        setBrandIntelligence(normalizeBrands(brandResult.status === 'fulfilled' ? brandResult.value : []));

        const failedCount = [filesResult, agentResult, brandResult, topicResult].filter(r => r.status === 'rejected').length;
        if (failedCount === 4) {
          throw new Error('All endpoints failed');
        }
      } catch {
        setError('ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาตรวจสอบ Backend Server');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredAudioFiles = useMemo(() => {
    return audioFiles.filter((item) => {
      const d = toSafeDate(item.date);
      if (!d) return false;
      if (filterType === 'Day') {
        return sameDay(d, selectedDate);
      }
      if (filterType === 'Month') {
        return sameMonth(d, selectedDate);
      }
      return sameYear(d, selectedDate);
    });
  }, [audioFiles, filterType, selectedDate]);

  useEffect(() => {
    const validIds = new Set(audioFiles.map((file) => file.file_id));
    requestedTopicIdsRef.current.forEach((fileId) => {
      if (!validIds.has(fileId)) requestedTopicIdsRef.current.delete(fileId);
    });

    setTopicByFileId((prev) => {
      let changed = false;
      const next: Record<string, string> = {};

      Object.entries(prev).forEach(([fileId, topic]) => {
        if (!validIds.has(fileId)) {
          changed = true;
          return;
        }
        next[fileId] = topic;
      });

      return changed ? next : prev;
    });
  }, [audioFiles]);

  useEffect(() => {
    const requestedIds = requestedTopicIdsRef.current;
    const targets = filteredAudioFiles.filter((file) => {
      if (file.topic || topicByFileId[file.file_id]) return false;
      if (requestedIds.has(file.file_id)) return false;
      return file.status === 'COMPLETE';
    });

    if (targets.length === 0) return;

    let active = true;
    targets.forEach((file) => requestedIds.add(file.file_id));

    void runWithConcurrencyLimit(targets, 8, async (file) => {
      try {
        const detail = await fetchJson(`${API_BASE}/api/v1/audio/detail/${encodeURIComponent(file.file_id)}`);
        return { fileId: file.file_id, topic: extractTopicText(detail) || 'ไม่ระบุหัวข้อ' };
      } catch {
        return { fileId: file.file_id, topic: 'ไม่ระบุหัวข้อ' };
      }
    }).then((results) => {
      results.forEach((result) => requestedIds.delete(result.fileId));
      if (!active) return;

      setTopicByFileId((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          next[result.fileId] = result.topic;
        });
        return next;
      });
    }).catch(() => {
      targets.forEach((file) => requestedIds.delete(file.file_id));
    });

    return () => {
      active = false;
      targets.forEach((file) => requestedIds.delete(file.file_id));
    };
  }, [filteredAudioFiles, topicByFileId]);

  const totalFiles = filteredAudioFiles.length;
  const positiveCount = filteredAudioFiles.filter(f => f.sentiment === 'positive').length;
  const neutralCount = filteredAudioFiles.filter(f => f.sentiment === 'neutral').length;
  const negativeCount = filteredAudioFiles.filter(f => f.sentiment === 'negative').length;
  const processingCount = filteredAudioFiles.filter(f => f.status !== 'COMPLETE').length;

  const sentimentData = [
    {
      label: 'Positive',
      count: positiveCount,
      percentage: totalFiles > 0 ? Math.round((positiveCount / totalFiles) * 100) : 0,
      color: 'bg-emerald-500',
      icon: Smile
    },
    {
      label: 'Neutral',
      count: neutralCount,
      percentage: totalFiles > 0 ? Math.round((neutralCount / totalFiles) * 100) : 0,
      color: 'bg-slate-400',
      icon: Meh
    },
    {
      label: 'Negative',
      count: negativeCount,
      percentage: totalFiles > 0 ? Math.round((negativeCount / totalFiles) * 100) : 0,
      color: 'bg-red-500',
      icon: Frown
    }
  ];

  const brandDistribution = useMemo(() => {
    const counter = new Map<string, number>();
    for (const item of filteredAudioFiles) {
      const brand = item.brand || 'UNKNOWN';
      counter.set(brand, (counter.get(brand) || 0) + 1);
    }
    return Array.from(counter.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [filteredAudioFiles]);

  const brandSummary = useMemo(() => {
    const totalFiles = brandDistribution.reduce((sum, brand) => sum + brand.count, 0);
    const topBrand = brandDistribution[0];

    return {
      totalFiles,
      totalBrands: brandDistribution.length,
      topBrand,
      topBrandShare: totalFiles > 0 && topBrand ? Math.round((topBrand.count / totalFiles) * 100) : 0
    };
  }, [brandDistribution]);

  const agentCaseRows = useMemo(
    () => filteredAudioFiles.slice(0, 15),
    [filteredAudioFiles]
  );

  useEffect(() => {
    const requestedIds = requestedCaseScoreIdsRef.current;
    const targets = agentCaseRows.filter((file) => {
      if (requestedIds.has(file.file_id)) return false;
      const cached = caseScoresRef.current[file.file_id];
      const hasQaScore = file.qa_score !== undefined || cached?.qa !== undefined;
      const hasCsatScore = file.csat_score !== undefined || cached?.csat !== undefined;
      if (hasQaScore && hasCsatScore) return false;
      return !cached?.loading;
    });

    if (targets.length === 0) return;

    targets.forEach((file) => requestedIds.add(file.file_id));
    setCaseScores((prev) => {
      const next = { ...prev };
      targets.forEach((file) => {
        const current = next[file.file_id] || {};
        next[file.file_id] = {
          qa: file.qa_score ?? current.qa,
          csat: file.csat_score ?? current.csat,
          loading: true
        };
      });
      caseScoresRef.current = next;
      return next;
    });

    let active = true;

    void runWithConcurrencyLimit(targets, 15, async (file) => {
      const cached = caseScoresRef.current[file.file_id];
      const result = await fetchCaseScores(file, cached);

      requestedIds.delete(file.file_id);
      if (active) {
        setCaseScores((prev) => {
          const next = {
            ...prev,
            [result.fileId]: {
              qa: result.qa,
              csat: result.csat,
              loading: false
            }
          };
          caseScoresRef.current = next;
          writeAgentCaseScoreCache(next);
          return next;
        });
      }

      return result;
    }).catch(() => {
      targets.forEach((file) => requestedIds.delete(file.file_id));
      if (!active) return;

      setCaseScores((prev) => {
        const next = { ...prev };
        targets.forEach((file) => {
          const current = next[file.file_id] || {};
          next[file.file_id] = {
            qa: file.qa_score ?? current.qa,
            csat: file.csat_score ?? current.csat,
            loading: false
          };
        });
        caseScoresRef.current = next;
        writeAgentCaseScoreCache(next);
        return next;
      });
    });

    return () => {
      active = false;
      targets.forEach((file) => requestedIds.delete(file.file_id));
    };
  }, [agentCaseRows]);

  const handleManualRefresh = async () => {
    if (isRefreshingTable) return;
    
    // Save current scroll position of the main layout container
    const mainScrollTop = mainRef.current?.scrollTop || 0;
    
    setIsRefreshingTable(true);
    try {
      requestedCaseScoreIdsRef.current.clear();
      setCaseScores((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (next[key].qa === undefined || next[key].csat === undefined) {
            delete next[key];
          }
        });
        caseScoresRef.current = next;
        return next;
      });

      const freshItems = await fetchAllAudioFiles();
      const freshFiles = normalizeAudioFiles({ files: freshItems });
      setAudioFiles(freshFiles);
      
      // Force main container scroll position to stay intact
      setTimeout(() => {
        if (mainRef.current) mainRef.current.scrollTo({ top: mainScrollTop, behavior: 'instant' });
      }, 0);
      setTimeout(() => {
        if (mainRef.current) mainRef.current.scrollTo({ top: mainScrollTop, behavior: 'instant' });
      }, 50);
    } catch {
      // ignore
    } finally {
      setIsRefreshingTable(false);
    }
  };

  const failedEndpoints = useMemo(
    () => Object.entries(endpointStatus).filter(([, status]) => !status.ok),
    [endpointStatus]
  );

  const topicFileGroups = useMemo(
    () => buildTopicFileGroups(filteredAudioFiles, topicByFileId, { maxGroups: 8 }),
    [filteredAudioFiles, topicByFileId]
  );

  const visibleTopicDistribution = useMemo(() => {
    return topicFileGroups.map(({ name, value }) => ({ name, value }));
  }, [topicFileGroups]);

  const selectedTopicGroup = useMemo(() => {
    if (!selectedTopicName) return null;
    return topicFileGroups.find((topic) => topic.name === selectedTopicName) ?? null;
  }, [selectedTopicName, topicFileGroups]);

  useEffect(() => {
    if (!selectedTopicName) return;
    if (!topicFileGroups.some((topic) => topic.name === selectedTopicName)) {
      setSelectedTopicName(null);
    }
  }, [selectedTopicName, topicFileGroups]);

  const visibleBrandIntelligence = useMemo(() => {
    if (filteredAudioFiles.length === 0) return [];

    const counter = new Map<string, BrandRow>();

    for (const item of filteredAudioFiles) {
      const brandName = item.brand || 'UNKNOWN';
      const existing = counter.get(brandName) ?? {
        brand_name: brandName,
        total_mentions: 0,
        positive_mentions: 0,
        negative_mentions: 0
      };

      existing.total_mentions += 1;
      if (item.sentiment === 'positive') existing.positive_mentions += 1;
      if (item.sentiment === 'negative') existing.negative_mentions += 1;

      counter.set(brandName, existing);
    }

    return Array.from(counter.values()).sort(
      (a, b) => b.total_mentions - a.total_mentions || a.brand_name.localeCompare(b.brand_name)
    );
  }, [filteredAudioFiles]);

  const dateLabel = formatDateLabel(selectedDate, filterType);

  const brandKeywordStopwords = useMemo(
    () => buildBrandKeywordStopwords(filteredAudioFiles),
    [filteredAudioFiles]
  );

  useEffect(() => {
    const loadKeywords = async () => {
      const KEYWORD_SAMPLE_LIMIT = 150;
      const CONCURRENCY = 8;
      const filteredComplete = filteredAudioFiles.filter((file) => file.status === 'COMPLETE');
      const sorted = [...filteredComplete].sort((left, right) => {
        const leftDate = toSafeDate(left.date)?.getTime() ?? 0;
        const rightDate = toSafeDate(right.date)?.getTime() ?? 0;
        return rightDate - leftDate;
      });

      const sample = sorted.slice(0, KEYWORD_SAMPLE_LIMIT);
      setKeywordSampleCount(sample.length);
      if (sample.length === 0) {
        setKeywordFrequency([]);
        return;
      }

      setKeywordLoading(true);
      try {
        const keywordLists = await runWithConcurrencyLimit(sample, CONCURRENCY, async (file) => {
          const cached = keywordCacheRef.current.get(file.file_id);
          if (cached) return cached;

          const payload = await fetchJson(`${API_BASE}/api/v1/ai/keywords/${file.file_id}`);
          const parsed = parseKeywordResponse(payload);
          keywordCacheRef.current.set(file.file_id, parsed);
          return parsed;
        });

        const counter = new Map<string, { display: string; count: number }>();
        keywordLists.forEach((list) => {
          const uniq = new Set(
            list
              .filter((kw) => !isBrandKeyword(kw, brandKeywordStopwords))
              .map((kw) => compactText(kw))
              .filter(Boolean)
          );
          uniq.forEach((key) => {
            if (!isUsefulKeyword(key)) return;
            const existing = counter.get(key) ?? { display: key, count: 0 };
            existing.count += 1;
            counter.set(key, existing);
          });
        });

        const rows = Array.from(counter.entries())
          .map(([, value]) => value)
          .filter((row) => row.count > 0)
          .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display));

        const totalMentions = rows.reduce((sum, row) => sum + row.count, 0);
        const top = rows.slice(0, 10).map((row) => ({
          keyword: row.display,
          count: row.count,
          percentage: totalMentions > 0 ? Math.round((row.count / totalMentions) * 100) : 0
        }));

        setKeywordFrequency(top);
      } catch {
        setKeywordFrequency([]);
      } finally {
        setKeywordLoading(false);
      }
    };

    loadKeywords();
  }, [brandKeywordStopwords, filteredAudioFiles]);

  const handleFilterTypeChange = (type: FilterType) => {
    setFilterType(type);
    setSelectedDate(getReferenceDate(type));
  };

  const moveDate = (delta: number) => {
    setSelectedDate((current) => shiftSelectedDate(current, filterType, delta));
  };

  const topicTotalCount = visibleTopicDistribution.reduce((sum, topic) => sum + topic.value, 0);
  const topicGroupCount = visibleTopicDistribution.length;

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={36} className="animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Loading real dashboard data...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <AlertCircle size={36} className="text-red-500 mx-auto mb-3" />
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      <Sidebar />
      <main ref={mainRef} className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
        <div className="max-w-full mx-auto space-y-6">

          <div className="mb-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="relative">
              {/* Decorative Frame */}
              <div className="absolute left-0 top-1 bottom-[34px] w-px bg-gradient-to-b from-indigo-400 to-transparent opacity-60"></div>
              {/* 4-Point Star top-left */}
              <svg className="absolute -left-[5.5px] top-0 w-3 h-3 text-indigo-500 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C12 0 12 10.5 24 12C24 12 12 13.5 12 24C12 24 12 13.5 0 12C0 12 12 10.5 12 0Z" />
              </svg>
              {/* Dot and horizontal line bottom-left */}
              <div className="absolute left-0 bottom-8 w-1.5 h-1.5 rounded-full bg-indigo-500 -ml-[2px] opacity-80"></div>
              <div className="absolute left-1.5 bottom-[34.5px] right-24 h-px bg-gradient-to-r from-indigo-400 via-indigo-200 to-transparent opacity-60"></div>
              
              {/* Right Decorative Graphics (Swirls) */}
              <svg className="absolute -right-4 top-0 w-32 h-24 text-indigo-300 pointer-events-none opacity-40 mix-blend-multiply hidden sm:block" viewBox="0 0 200 100" fill="none" stroke="currentColor">
                <path d="M150,80 Q100,80 120,40 T180,20" strokeWidth="0.5" fill="none"/>
                <path d="M130,90 Q80,90 90,50 T160,10" strokeWidth="0.5" fill="none"/>
                <path d="M160,70 C130,50 180,30 190,50 C200,70 170,90 140,80" strokeWidth="0.5" fill="none"/>
                <path d="M170,30 Q175,20 180,30 Q175,40 170,30Z" fill="currentColor" stroke="none" opacity="0.5"/>
                <path d="M185,45 Q195,40 195,50 Q185,60 185,45Z" fill="currentColor" stroke="none" opacity="0.4"/>
                <path d="M165,65 Q175,60 180,70 Q170,80 165,65Z" fill="currentColor" stroke="none" opacity="0.6"/>
                <path d="M140,65 C140,65 140,75 145,75 C145,75 140,75 140,85 C140,85 140,75 135,75 C135,75 140,75 140,65Z" fill="#4F46E5" stroke="none"/>
                <circle cx="160" cy="25" r="1.5" fill="currentColor"/>
                <circle cx="150" cy="15" r="1" fill="currentColor"/>
                <circle cx="185" cy="85" r="1.5" fill="currentColor"/>
              </svg>

              <div className="pl-6 pt-2 pb-6 relative z-10">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#4F46E5] leading-none">Voice</h1>
                  <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-black tracking-tight text-[#0F172A] leading-none">Analytics</h1>
                  <span 
                    className="text-[32px] sm:text-[38px] md:text-[44px] leading-none ml-1 sm:ml-1.5 relative top-1.5 sm:top-2" 
                    style={{ 
                      fontFamily: 'var(--font-great-vibes), cursive', 
                      background: 'linear-gradient(to right, #0F172A, #4F46E5, #8B5CF6)', 
                      WebkitBackgroundClip: 'text', 
                      WebkitTextFillColor: 'transparent',
                      padding: '8px 12px 8px 0',
                      lineHeight: '1.2'
                    }}
                  >
                    Dashboard
                  </span>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#818CF8] uppercase">
                  <span>BACKEND ANALYSIS</span>
                  <span className="text-indigo-200">|</span>
                  <span>
                    {filterType === 'Day' 
                      ? selectedDate.toLocaleDateString('th-TH', { weekday: 'long' }) 
                      : filterType === 'Month'
                        ? selectedDate.toLocaleDateString('th-TH', { month: 'long' })
                        : `ปี ${selectedDate.toLocaleDateString('th-TH', { year: 'numeric' })}`}
                  </span>
                  <span className="text-indigo-200">|</span>
                  <span>
                    {filterType === 'Day'
                      ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()
                      : filterType === 'Month'
                        ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
                        : selectedDate.toLocaleDateString('en-US', { year: 'numeric' }).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <div className="flex bg-white border border-slate-200 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden text-[13px]">
                {(['Day', 'Month', 'Year'] as FilterType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleFilterTypeChange(type)}
                    className={`px-4 py-2 font-bold transition-colors cursor-pointer ${filterType === type ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'} ${type !== 'Year' ? 'border-r border-slate-100' : ''}`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
                <button onClick={() => moveDate(-1)} className="px-2 py-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer font-bold">-</button>
                <span className="text-xs font-bold text-slate-700 min-w-[120px] text-center">{dateLabel}</span>
                <button onClick={() => moveDate(1)} className="px-2 py-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer font-bold">+</button>
              </div>

              <button
                onClick={() => setSelectedDate(getReferenceDate(filterType))}
                className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:bg-indigo-50 transition-colors cursor-pointer text-slate-400 hover:text-indigo-600"
                title="Current Period"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Files */}
            <div className="bg-white rounded-2xl p-6 flex items-center gap-5 shadow-[0_2px_15px_-3px_rgba(6,81,237,0.08)] border border-slate-100 transition-transform hover:scale-[1.02]">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_4px_15px_-3px_rgba(6,81,237,0.1)] ring-1 ring-slate-100">
                <img src="/total.png" alt="Total Files" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total</p>
                <h3 className="text-3xl font-extrabold text-slate-800">{totalFiles}</h3>
              </div>
            </div>

            {/* Active Brands */}
            <div className="bg-white rounded-2xl p-6 flex items-center gap-5 shadow-[0_2px_15px_-3px_rgba(6,81,237,0.08)] border border-slate-100 transition-transform hover:scale-[1.02]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white via-orange-50/60 to-amber-100/40 shadow-[0_4px_15px_-3px_rgba(245,158,11,0.12),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_6px_rgba(245,158,11,0.1)] border border-amber-100 flex items-center justify-center shrink-0">
                <Building2 size={24} strokeWidth={2} className="text-amber-500 drop-shadow-sm" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Active Brands</p>
                <h3 className="text-3xl font-extrabold text-slate-800">{brandSummary.totalBrands}</h3>
              </div>
            </div>

            {/* Processing */}
            <div className="bg-white rounded-2xl p-6 flex items-center gap-5 shadow-[0_2px_15px_-3px_rgba(6,81,237,0.08)] border border-slate-100 transition-transform hover:scale-[1.02]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white via-amber-50/50 to-amber-100/30 shadow-[0_4px_15px_-3px_rgba(245,158,11,0.1),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_6px_rgba(245,158,11,0.1)] border border-amber-100 flex items-center justify-center shrink-0">
                <Loader2 size={24} strokeWidth={2} className="text-amber-500 animate-[spin_3s_linear_infinite] drop-shadow-sm" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Processing</p>
                <h3 className="text-3xl font-extrabold text-slate-800">{processingCount}</h3>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white rounded-2xl p-6 flex items-center gap-5 shadow-[0_2px_15px_-3px_rgba(6,81,237,0.08)] border border-slate-100 transition-transform hover:scale-[1.02]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white via-blue-50/50 to-blue-100/30 shadow-[0_4px_15px_-3px_rgba(37,99,235,0.1),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_6px_rgba(37,99,235,0.1)] border border-blue-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} strokeWidth={2} className="text-blue-500 drop-shadow-sm" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Completed</p>
                <h3 className="text-3xl font-extrabold text-slate-800">{totalFiles - processingCount}</h3>
              </div>
            </div>
          </div>

          {/* Alert for Fetch Errors */}
          {failedEndpoints.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
              <div className="flex items-center gap-2 mb-2">
                <TriangleAlert size={16} className="text-amber-600" />
                <p className="text-sm font-bold text-amber-800">บาง endpoint โหลดไม่สำเร็จ</p>
              </div>
              <ul className="text-xs text-amber-700 space-y-1">
                {failedEndpoints.map(([name, status]) => (
                  <li key={name}>
                    {name} - {status.statusCode ? `HTTP ${status.statusCode}` : status.message || 'failed'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Second Row: Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sentiment Analysis Distribution */}
            <div className="bg-white rounded-xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shadow-sm"></div>
                  Sentiment Analysis Distribution
                </h3>
                <MoreHorizontal className="text-slate-400" size={20} />
              </div>

              <div className="space-y-4">
                {sentimentData.map((data, i) => {
                  let barColor = '';
                  let textColor = '';
                  if (data.label === 'Positive') {
                    barColor = 'bg-emerald-500';
                    textColor = 'text-emerald-500';
                  } else if (data.label === 'Negative') {
                    barColor = 'bg-red-500';
                    textColor = 'text-red-500';
                  } else {
                    barColor = 'bg-[#54657E]';
                    textColor = 'text-[#54657E]';
                  }

                  const Icon = data.icon;

                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-16">
                        <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] mb-1">
                          <Icon size={18} className={textColor} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{data.label}</span>
                      </div>

                      <div className="flex-1 flex items-center pb-3">
                        <div className="w-full bg-slate-100/50 rounded-lg h-8 relative flex items-center">
                          <div
                            className={`${barColor} h-full rounded-lg transition-all duration-700 flex items-center px-4 min-w-[2rem] shadow-sm`}
                            style={{ width: `${Math.max(data.percentage, 5)}%` }}
                          >
                            <span className="text-sm font-bold text-white z-10">{data.count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Topic Distribution */}
            <div className="bg-white rounded-xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-500 to-pink-600 shadow-sm"></div>
                    Topic Distribution
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">กดหัวข้อเพื่อดูไฟล์ที่อยู่ในกลุ่มนั้น</p>
                </div>
                <div className="shrink-0 rounded-full border border-purple-100 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">
                  {topicGroupCount} Topics
                </div>
              </div>

              {visibleTopicDistribution.length > 0 ? (
                <>
                  <div className="mt-4 max-h-[205px] space-y-1.5 overflow-y-auto pr-1">
                    {topicFileGroups.map((topic, idx) => {
                      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
                      const color = colors[idx % colors.length];
                      const percentage = topicTotalCount > 0 ? Math.round((topic.value / topicTotalCount) * 100) : 0;
                      const isSelected = selectedTopicName === topic.name;

                      return (
                        <button
                          key={topic.name}
                          type="button"
                          suppressHydrationWarning
                          onClick={() => setSelectedTopicName(isSelected ? null : topic.name)}
                          className={`group w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                            isSelected ? 'bg-purple-50 text-purple-800' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }}></span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                              {topic.name}
                            </span>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                              {topic.value} files
                            </span>
                            <span className="w-10 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-400">
                              {percentage}%
                            </span>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.max(percentage, 4)}%`, backgroundColor: color }}
                            ></div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    {selectedTopicGroup ? (
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-700">{selectedTopicGroup.name}</p>
                            <p className="text-[11px] text-slate-400">{selectedTopicGroup.files.length} related files</p>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold text-purple-600">Click file to open</span>
                        </div>

                        <div className="max-h-[155px] overflow-y-auto">
                          {selectedTopicGroup.files.slice(0, 30).map((file) => (
                            <Link
                              key={file.file_id}
                              href={`/files/${file.file_id}`}
                              className="flex items-center gap-2 border-b border-slate-100 py-2 text-xs last:border-b-0 hover:text-blue-700"
                            >
                              <FileAudio size={14} className="shrink-0 text-blue-500" />
                              <span className="shrink-0 font-bold text-slate-700">#{file.file_id.slice(0, 8)}</span>
                              <span className="min-w-0 flex-1 truncate text-slate-500">
                                {file.brand || 'Unknown Brand'} / {file.agent_name || 'Unknown Agent'}
                              </span>
                              <span className="shrink-0 text-[11px] text-slate-400">{formatCompactDate(file.date)}</span>
                            </Link>
                          ))}
                          {selectedTopicGroup.files.length > 30 && (
                            <p className="py-2 text-center text-[11px] text-slate-400">
                              Showing 30 of {selectedTopicGroup.files.length} files
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-5 text-center text-xs font-medium text-slate-400">
                        เลือกหัวข้อด้านบนเพื่อดูว่าไฟล์ไหนอยู่ในหัวข้อนั้น
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">No Data</div>
              )}
            </div>
          </div>

          {/* Keyword Frequency */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_2px_15px_-3px_rgba(6,81,237,0.08)] border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_4px_15px_-3px_rgba(6,81,237,0.1)] ring-1 ring-slate-100">
                <img src="/iconkey.png" alt="Keyword Frequency" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Keyword Frequency (Top 10)</h3>
                <p className="mt-1 text-sm text-slate-500">แสดง 10 คำที่ถูกกล่าวถึงมากที่สุดในช่วงเวลาที่เลือก (จาก {keywordSampleCount.toLocaleString()} รายการล่าสุด)</p>
              </div>
            </div>

            {keywordLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 size={36} className="animate-spin text-blue-600" />
              </div>
            ) : keywordFrequency.length > 0 ? (
              <div className="flex flex-col lg:flex-row gap-10">
                <div className="flex-1 space-y-5 py-2">
                  {keywordFrequency.map((item, idx) => (
                    <div key={item.keyword} className="flex items-center gap-4">
                      <span className="w-6 text-center text-[13px] font-bold text-blue-500">{idx + 1}</span>
                      <span className="w-32 text-sm font-semibold text-slate-700 truncate">{item.keyword}</span>
                      <div className="flex-1 flex items-center">
                        <div className="w-full bg-slate-50 rounded-full h-3.5">
                          <div className="bg-[#4a85f6] h-3.5 rounded-full transition-all duration-1000" style={{ width: `${item.percentage}%` }}></div>
                        </div>
                      </div>
                      <span className="w-12 text-right text-sm font-bold text-[#4a85f6]">{item.percentage}%</span>
                    </div>
                  ))}
                </div>

                <div className="w-full lg:w-72 bg-gradient-to-b from-[#f8faff] to-white rounded-[24px] p-6 border border-blue-50 flex flex-col items-center justify-center text-center relative overflow-hidden shrink-0 shadow-[0_4px_20px_-4px_rgba(74,133,246,0.05)]">
                  {/* Decorative background curves */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDMyMCI+PHBhdGggZmlsbD0iI2YxZjZmZiIgZmlsbC1vcGFjaXR5PSIxIiBkPSJNMCAyMjRsMTIwLTUuM2MxMjAtNS4zIDM2MC0xNiA2MDAtNS40IDIzOSAxMC43IDQ4MCA0Mi43IDYwMCA1OC43bDEyMCAxNnY5NkgwaHoiPjwvcGF0aD48L3N2Zz4=')] bg-cover bg-bottom opacity-70"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDMyMCI+PHBhdGggZmlsbD0iI2U1ZjBwdIiIGZpbGwtb3BhY2l0eT0iMC42IiBkPSJNMCAxNjBsMTIwIDUuM2MxMjAgNS4zIDM2MCAxNiA2MDAgNS40IDIzOS0xMC43IDQ4MC00Mi43IDYwMC01OC43bDEyMC0xNnYxOTJIMHoiPjwvcGF0aD48L3N2Zz4=')] bg-cover bg-bottom"></div>

                  <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_8px_30px_rgba(74,133,246,0.15)] relative z-10 border border-blue-50">
                    <div className="h-14 w-14 bg-blue-50 rounded-full flex items-center justify-center">
                      <Flame size={28} className="text-[#4a85f6] fill-[#4a85f6]" strokeWidth={1.5} />
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-[#4a85f6] bg-white border border-blue-100 px-4 py-1.5 rounded-full mb-6 relative z-10 shadow-sm">Key Insight</span>

                  <p className="text-[15px] font-medium text-slate-600 leading-[1.8] relative z-10">
                    คำว่า <span className="font-bold text-[#4a85f6] text-[17px]">&quot;{keywordFrequency[0].keyword}&quot;</span><br />
                    ถูกกล่าวถึงมากที่สุด<br />
                    คิดเป็น <span className="font-bold text-[#4a85f6] text-xl">{keywordFrequency[0].percentage}%</span> ของทั้งหมด
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm text-center py-10">
                No keyword data available
              </div>
            )}
          </div>

          {/* Third Row: Brand Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Files by Brand */}
            <div className="bg-white rounded-xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-orange-400 to-amber-600 shadow-sm"></div>
                    Files by Brand
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Sorted by volume with a tighter layout so every brand is easier to scan.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-orange-700">
                    <Building2 size={13} />
                    {brandSummary.totalBrands} Brands
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                    <Folder size={13} />
                    {brandSummary.totalFiles.toLocaleString()} Files
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-[280px] overflow-y-auto pr-1 md:grid-cols-2">
                {brandDistribution.length > 0 ? (
                  brandDistribution.map((brand, i) => {
                    const tone = BRAND_TONES[i % BRAND_TONES.length];
                    const share = brandSummary.totalFiles > 0 ? Math.round((brand.count / brandSummary.totalFiles) * 100) : 0;
                    const relativeWidth = brandSummary.topBrand ? Math.max((brand.count / brandSummary.topBrand.count) * 100, 12) : 0;

                    return (
                      <div key={brand.name} className="rounded-xl border border-slate-200/80 bg-gradient-to-r from-white via-orange-50/40 to-amber-50/50 p-3 shadow-sm shadow-orange-100/30">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${tone.badge}`}>
                            {String(i + 1).padStart(2, '0')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">{brand.name}</p>
                                <p className="mt-1 text-[11px] text-slate-400">{share}% of visible recordings</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xl font-bold leading-none text-slate-800">{brand.count.toLocaleString()}</p>
                                <p className="mt-1 text-[11px] font-medium text-slate-400">files</p>
                              </div>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-orange-100">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
                                style={{ width: `${relativeWidth}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center text-slate-400 text-sm py-8">No files data available</div>
                )}
              </div>
            </div>

            {/* Brand Intelligence */}
            <div className="bg-white rounded-xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
              <h3 className="font-semibold text-[15px] text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-[#00A985]"></div>
                Brand Intelligence
              </h3>

              <div className="flex justify-end gap-1.5 mb-2 px-1">
                <div className="w-[60px] text-center text-[10px] font-medium text-slate-500">Positive</div>
                <div className="w-[60px] text-center text-[10px] font-medium text-slate-500">Negative</div>
                <div className="w-[60px] text-center text-[10px] font-medium text-slate-500">Neutral</div>
              </div>

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {visibleBrandIntelligence.length > 0 ? (
                  visibleBrandIntelligence.map((brand, idx) => {
                    const pointColors = ['bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];
                    const neutralMentions = brand.total_mentions - brand.positive_mentions - brand.negative_mentions;

                    return (
                      <div key={idx} className="flex items-center justify-between bg-white px-3 py-2.5 rounded-lg border border-slate-100 shadow-[0_2px_5px_-2px_rgba(0,0,0,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${pointColors[idx % pointColors.length]}`}></div>
                          <span className="font-bold text-[12px] text-slate-800 tracking-wide uppercase">{brand.brand_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-[60px] bg-[#EEFDF3] text-[#10B981] font-bold text-[12px] py-1 rounded-md text-center">
                            +{brand.positive_mentions}
                          </div>
                          <div className="w-[60px] bg-[#FEF2F2] text-[#EF4444] font-bold text-[12px] py-1 rounded-md text-center">
                            -{brand.negative_mentions}
                          </div>
                          <div className="w-[60px] bg-[#F4F7FB] text-[#64748B] font-bold text-[12px] py-1 rounded-md text-center">
                            ={Math.max(0, neutralMentions)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-400 text-xs py-6">No brand data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Fourth Row: Agent Performance */}
          <div className="mt-6 bg-white rounded-xl p-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-[#4F46E5]"></div>
                  Agent Performance
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 ml-3">รายเคสจากไฟล์จริง กด File ID เพื่อเปิด Transcript</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isRefreshingTable) void handleManualRefresh();
                  }}
                  className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${
                    isRefreshingTable 
                      ? 'text-indigo-400 bg-indigo-50/50 cursor-default' 
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer'
                  }`}
                  title="Refresh Table"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingTable ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
                <div className="text-[11px] font-medium text-slate-500 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100">
                  {agentCaseRows.length} Recent Cases
                </div>
              </div>
            </div>

            <div ref={tableContainerRef} className="max-h-[260px] overflow-y-auto rounded-lg border border-slate-100">
              {agentCaseRows.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-bold">File</th>
                      <th className="px-3 py-2 font-bold">Brand</th>
                      <th className="px-3 py-2 font-bold">Agent</th>
                      <th className="px-3 py-2 font-bold">Sentiment</th>
                      <th className="px-3 py-2 text-right font-bold">QA</th>
                      <th className="px-3 py-2 text-right font-bold">CSAT</th>
                      <th className="px-3 py-2 text-right font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {agentCaseRows.map((file) => {
                      const score = caseScores[file.file_id];
                      const qaScore = file.qa_score ?? score?.qa;
                      const csatScore = file.csat_score ?? score?.csat;
                      const hasQaScore = typeof qaScore === 'number' && Number.isFinite(qaScore);
                      const hasCsatScore = typeof csatScore === 'number' && Number.isFinite(csatScore);
                      const sentimentClass =
                        file.sentiment === 'positive'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : file.sentiment === 'negative'
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-slate-50 text-slate-500 border-slate-100';
                      const statusClass =
                        file.status === 'COMPLETE'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border-amber-100';

                      return (
                        <tr
                          key={file.file_id}
                          role="link"
                          tabIndex={0}
                          onClick={() => router.push(`/files/${file.file_id}`)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              router.push(`/files/${file.file_id}`);
                            }
                          }}
                          className="cursor-pointer hover:bg-slate-50/70 focus:bg-slate-50/70 focus:outline-none"
                        >
                          <td className="px-3 py-2">
                            <Link
                              href={`/files/${file.file_id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                            >
                              #{file.file_id.slice(0, 8)}
                            </Link>
                            <p className="mt-0.5 text-[10px] text-slate-400">{file.date ? file.date.slice(0, 10) : 'Transcript'}</p>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex max-w-[110px] items-center rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-600">
                              <span className="truncate">{file.brand || 'Unknown'}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-100">
                                {(file.agent_name || 'A').charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="max-w-[150px] truncate font-bold text-slate-700">{file.agent_name || 'Unknown Agent'}</p>
                                <p className="text-[10px] text-slate-400">case detail</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${sentimentClass}`}>
                              {file.sentiment || 'neutral'}
                            </span>
                          </td>
                          <td className={`px-3 py-2 text-right font-bold ${qaScore && qaScore >= 7 ? 'text-emerald-600' : qaScore && qaScore >= 5 ? 'text-amber-600' : qaScore ? 'text-rose-500' : 'text-slate-400'}`}>
                            {hasQaScore ? qaScore.toFixed(1) : '-'}
                          </td>
                          <td className={`px-3 py-2 text-right font-bold ${csatScore && csatScore >= 4 ? 'text-emerald-600' : csatScore && csatScore >= 3 ? 'text-amber-600' : csatScore ? 'text-rose-500' : 'text-slate-400'}`}>
                            {hasCsatScore ? csatScore.toFixed(1) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${statusClass}`}>
                              {file.status || 'UNKNOWN'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-slate-400 text-xs py-8">No case data available</div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
