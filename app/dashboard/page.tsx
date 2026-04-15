'use client';

import { useEffect, useMemo, useState } from 'react';
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
  LayoutDashboard
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
}

interface TopicRow {
  name: string;
  value: number;
}

interface AgentRow {
  agent_id: string;
  agent_name?: string;
  avg_qa_score: number;
  avg_csat_score: number;
  total_calls: number;
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

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
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
        date: ''
      };
    }
    return {
      file_id: toText(item.file_id, `file-${index}`),
      sentiment: toText(item.sentiment, 'neutral').toLowerCase(),
      brand: toText(item.brand),
      status: toText(item.status, 'UNKNOWN').toUpperCase(),
      date: toText(item.analyzed_date ?? item.upload_date ?? item.date ?? item.call_datetime ?? item.call_date)
    };
  });

const normalizeTopics = (payload: unknown): TopicRow[] =>
  toArray(payload, ['topic_distribution', 'topics', 'data', 'items']).map((item, index) => {
    if (!isObject(item)) {
      return { name: `Topic ${index + 1}`, value: 0 };
    }
    return {
      name: toText(item.name ?? item.topic ?? item.category, `Topic ${index + 1}`),
      value: toNum(item.value ?? item.count ?? item.total)
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
      total_calls: toNum(item.total_calls ?? item.calls ?? item.count)
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
  const [filterType, setFilterType] = useState<FilterType>('Day');
  const [selectedDate, setSelectedDate] = useState(() => getReferenceDate('Day'));

  const [audioFiles, setAudioFiles] = useState<AudioFileRow[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentRow[]>([]);
  const [brandIntelligence, setBrandIntelligence] = useState<BrandRow[]>([]);
  const [topicDistribution, setTopicDistribution] = useState<TopicRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointStatus, setEndpointStatus] = useState<EndpointStatusMap>({});

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
        setTopicDistribution(normalizeTopics(topicResult.status === 'fulfilled' ? topicResult.value : []));

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

  const failedEndpoints = useMemo(
    () => Object.entries(endpointStatus).filter(([, status]) => !status.ok),
    [endpointStatus]
  );

  const visibleBrandIntelligence = useMemo(() => {
    if (audioFiles.length === 0) return brandIntelligence;

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
  }, [audioFiles, brandIntelligence, filteredAudioFiles]);

  const dateLabel = formatDateLabel(selectedDate, filterType);

  const handleFilterTypeChange = (type: FilterType) => {
    setFilterType(type);
    setSelectedDate(getReferenceDate(type));
  };

  const moveDate = (delta: number) => {
    setSelectedDate((current) => shiftSelectedDate(current, filterType, delta));
  };

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
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-full mx-auto space-y-6">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white via-indigo-50/50 to-indigo-100/20 shadow-[0_4px_15px_-3px_rgba(99,102,241,0.1),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_6px_rgba(99,102,241,0.1)] border border-indigo-100 flex items-center justify-center shrink-0">
                <LayoutDashboard size={26} strokeWidth={1.5} className="text-indigo-500 drop-shadow-sm" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Voice Analytics Dashboard</h1>
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Backend Analysis</span>
                  <span>•</span>
                  <span>มุมมอง {filterType}</span>
                  <span>•</span>
                  <span>{dateLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white via-indigo-50/50 to-indigo-100/30 shadow-[0_4px_15px_-3px_rgba(79,70,229,0.1),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_6px_rgba(79,70,229,0.1)] border border-indigo-100 flex items-center justify-center shrink-0">
                <FileAudio size={24} strokeWidth={2} className="text-indigo-500 drop-shadow-sm" />
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
            <div className="bg-white rounded-xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-500 to-pink-600 shadow-sm"></div>
                Topic Distribution
              </h3>
              <div className="relative h-[160px] flex justify-center items-center">
                {topicDistribution.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topicDistribution}
                          innerRadius={45}
                          outerRadius={70}
                          dataKey="value"
                          stroke="none"
                        >
                          {topicDistribution.map((entry, index) => {
                            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-white rounded-full px-3 py-1 text-sm font-bold shadow-sm">
                        {topicDistribution.reduce((sum, d) => sum + d.value, 0)} Total
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 text-sm">No Data</div>
                )}
              </div>

              <div className="mt-4 space-y-2 text-xs h-24 overflow-y-auto pr-2">
                {topicDistribution.map((topic, idx) => {
                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
                  const total = topicDistribution.reduce((sum, d) => sum + d.value, 0);
                  const percentage = total > 0 ? Math.round((topic.value / total) * 100) : 0;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                      <span className="text-slate-600 truncate flex-1">{topic.name}</span>
                      <span className="text-slate-400 font-medium">({percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
            <div className="bg-white rounded-xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600 shadow-sm"></div>
                Brand Intelligence
              </h3>
              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                {visibleBrandIntelligence.length > 0 ? (
                  visibleBrandIntelligence.map((brand, idx) => {
                    const pointColors = ['bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];
                    const neutralMentions = brand.total_mentions - brand.positive_mentions - brand.negative_mentions;

                    return (
                      <div key={idx} className="flex items-center justify-between bg-[#F8FAFC] p-4 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${pointColors[idx % pointColors.length]}`}></div>
                          <span className="font-medium text-slate-700 uppercase">{brand.brand_name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold tracking-wide">
                          <span className="text-emerald-500">+{brand.positive_mentions}</span>
                          <span className="text-red-500">-{brand.negative_mentions}</span>
                          <span className="text-[#54657E]">={Math.max(0, neutralMentions)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-400 text-sm py-8">No brand data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Fourth Row: Leaderboard */}
          <div className="bg-white rounded-xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-sm"></div>
                Agent Performance Leaderboard
              </h3>
              <button className="text-sm text-slate-500 font-medium hover:text-blue-600 transition-colors">
                View All Reports
              </button>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-4 px-4 w-20">Rank</th>
                    <th className="pb-4 px-4">Agent Name</th>
                    <th className="pb-4 px-4 w-40">QA Score</th>
                    <th className="pb-4 px-4 w-32">CSAT</th>
                    <th className="pb-4 px-4 w-24">Calls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {agentPerformance.length > 0 ? (
                    agentPerformance.slice(0, 5).map((agent, idx) => {
                      const RankNum = idx + 1;
                      const initial = (agent.agent_name || agent.agent_id).slice(0, 2).toUpperCase();
                      const avatarColors = [
                        'bg-blue-100 text-blue-600',
                        'bg-emerald-100 text-emerald-600',
                        'bg-amber-100 text-amber-600',
                        'bg-purple-100 text-purple-600',
                        'bg-rose-100 text-rose-600'
                      ];

                      return (
                        <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 font-medium text-slate-500">
                            {RankNum < 10 ? `0${RankNum}` : RankNum}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${avatarColors[idx % avatarColors.length]}`}>
                                {initial}
                              </div>
                              <span className="font-medium">{agent.agent_name || agent.agent_id}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <span className="font-bold">{((agent.avg_qa_score / 10) * 100).toFixed(0)}%</span>
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#54657E] rounded-full transition-all" style={{ width: `${(agent.avg_qa_score / 10) * 100}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-medium">{agent.avg_csat_score.toFixed(1)}/5.0</td>
                          <td className="py-4 px-4 text-slate-500">{agent.total_calls}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400 text-sm">No agent data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
