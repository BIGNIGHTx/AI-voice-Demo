'use client';

import { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  FileAudio,
  Smile,
  Meh,
  Frown,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Tag,
  Calendar,
  Trophy,
  Building2,
  TrendingUp,
  AlertCircle,
  Loader2,
  TriangleAlert
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

type FilterType = 'Day' | 'Month' | 'Year';

interface AudioFileRow {
  file_id: string;
  sentiment: string;
  brand: string;
  status: string;
  date: string;
}

interface TrendRow {
  date: string;
  positive_calls: number;
  negative_calls: number;
  neutral_calls: number;
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
      date: toText(item.date ?? item.call_date ?? item.upload_date)
    };
  });

const normalizeTrends = (payload: unknown): TrendRow[] =>
  toArray(payload, ['trends', 'data', 'items']).map((item, index) => {
    if (!isObject(item)) {
      return {
        date: `Day ${index + 1}`,
        positive_calls: 0,
        negative_calls: 0,
        neutral_calls: 0
      };
    }
    return {
      date: toText(item.date ?? item.day ?? item.label, `Day ${index + 1}`),
      positive_calls: toNum(item.positive_calls ?? item.positive ?? item.pos),
      negative_calls: toNum(item.negative_calls ?? item.negative ?? item.neg),
      neutral_calls: toNum(item.neutral_calls ?? item.neutral)
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

const sameMonth = (value: Date, target: Date) =>
  value.getFullYear() === target.getFullYear() && value.getMonth() === target.getMonth();

const sameYear = (value: Date, target: Date) => value.getFullYear() === target.getFullYear();

const toSafeDate = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function DashboardPage() {
  const [filterType, setFilterType] = useState<FilterType>('Day');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [audioFiles, setAudioFiles] = useState<AudioFileRow[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentRow[]>([]);
  const [brandIntelligence, setBrandIntelligence] = useState<BrandRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
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
          '/api/v1/analytics/trends',
          '/api/v1/analytics/topic-distribution'
        ];

        const [filesResult, agentResult, brandResult, trendsResult, topicResult] = await Promise.allSettled([
          fetchAllAudioFiles(),
          fetchJson(`${API_BASE}/api/v1/analytics/agent-performance`),
          fetchJson(`${API_BASE}/api/v1/analytics/brand-intelligence`),
          fetchJson(`${API_BASE}/api/v1/analytics/trends`),
          fetchJson(`${API_BASE}/api/v1/analytics/topic-distribution`)
        ]);

        setEndpointStatus(normalizeEndpointStatuses(endpointNames, [filesResult, agentResult, brandResult, trendsResult, topicResult]));

        const allFiles = filesResult.status === 'fulfilled' ? filesResult.value : [];
        const normalizedFiles = normalizeAudioFiles({ files: allFiles });
        setAudioFiles(normalizedFiles);

        const dated = normalizedFiles
          .map((item) => toSafeDate(item.date))
          .filter((d): d is Date => d !== null)
          .sort((a, b) => b.getTime() - a.getTime());

        if (dated.length > 0) {
          setSelectedDate(dated[0]);
        }

        setAgentPerformance(normalizeAgents(agentResult.status === 'fulfilled' ? agentResult.value : []));
        setBrandIntelligence(normalizeBrands(brandResult.status === 'fulfilled' ? brandResult.value : []));
        setTrends(normalizeTrends(trendsResult.status === 'fulfilled' ? trendsResult.value : []));
        setTopicDistribution(normalizeTopics(topicResult.status === 'fulfilled' ? topicResult.value : []));

        const failedCount = [filesResult, agentResult, brandResult, trendsResult, topicResult].filter(r => r.status === 'rejected').length;
        if (failedCount === 5) {
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
      if (!d) return true;
      if (filterType === 'Day') {
        return d.toDateString() === selectedDate.toDateString();
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
    return Array.from(counter.entries()).map(([name, count]) => ({ name, count }));
  }, [filteredAudioFiles]);

  const failedEndpoints = useMemo(
    () => Object.entries(endpointStatus).filter(([, status]) => !status.ok),
    [endpointStatus]
  );

  const dateLabel = selectedDate.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const moveDate = (delta: number) => {
    const next = new Date(selectedDate);
    if (filterType === 'Day') next.setDate(next.getDate() + delta);
    if (filterType === 'Month') next.setMonth(next.getMonth() + delta);
    if (filterType === 'Year') next.setFullYear(next.getFullYear() + delta);
    setSelectedDate(next);
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
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Voice Analytics Dashboard</h1>
              <p className="text-slate-500 text-sm">ข้อมูลจริงจาก Backend | มุมมอง {filterType} | {dateLabel}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-[13px]">
                {(['Day', 'Month', 'Year'] as FilterType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 font-bold transition-colors cursor-pointer ${filterType === type ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'} ${type !== 'Year' ? 'border-r border-slate-100' : ''}`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1">
                <button onClick={() => moveDate(-1)} className="px-2 py-1 text-slate-500 hover:text-slate-700 cursor-pointer">-</button>
                <span className="text-xs font-bold text-slate-700 min-w-[120px] text-center">{dateLabel}</span>
                <button onClick={() => moveDate(1)} className="px-2 py-1 text-slate-500 hover:text-slate-700 cursor-pointer">+</button>
              </div>

              <button
                onClick={() => setSelectedDate(new Date())}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
              >
                <Calendar size={16} className="text-slate-400" />
                <span className="text-[13px] font-bold uppercase tracking-tight">Today</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Files', value: totalFiles, icon: FileAudio, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Positive Analysis', value: positiveCount, icon: Smile, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Processing', value: processingCount, icon: RefreshCw, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Completed', value: totalFiles - processingCount, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300">
                <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {failedEndpoints.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center">
                <BarChart3 size={18} className="mr-2 text-blue-600" /> Sentiment Analysis Distribution
              </h3>
              <div className="space-y-6">
                {sentimentData.map((data, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-slate-700 flex items-center">
                        <data.icon size={16} className="mr-2 text-slate-400" /> {data.label} ({data.count} Files)
                      </span>
                      <span className="text-sm font-bold text-slate-800">{data.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className={`${data.color} h-full rounded-full transition-all duration-700 ease-out`} style={{ width: `${data.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center">
                <Tag size={18} className="mr-2 text-orange-500" /> Files by Brand
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {brandDistribution.length > 0 ? (
                  brandDistribution.map((brand, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center transition-all">
                      <span className="text-sm font-bold text-slate-700 uppercase">{brand.name}</span>
                      <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-blue-600">{brand.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 col-span-2">No files in this range.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center">
                <Trophy size={18} className="mr-2 text-yellow-600" /> Agent Performance Leaderboard
              </h3>
              {agentPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 uppercase">Rank</th>
                        <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 uppercase">Agent</th>
                        <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 uppercase">QA Score</th>
                        <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 uppercase">CSAT</th>
                        <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 uppercase">Calls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentPerformance.slice(0, 10).map((agent, idx) => (
                        <tr key={`${agent.agent_id}-${idx}`} className={`border-b border-slate-50 ${idx < 3 ? 'bg-yellow-50' : ''}`}>
                          <td className="py-3 px-2 text-sm font-bold text-slate-700">{idx === 0 ? '1' : idx === 1 ? '2' : idx === 2 ? '3' : `#${idx + 1}`}</td>
                          <td className="py-3 px-2 text-sm font-semibold text-slate-800">{agent.agent_name || agent.agent_id}</td>
                          <td className="py-3 px-2 text-sm text-slate-700">{agent.avg_qa_score.toFixed(1)}</td>
                          <td className="py-3 px-2 text-sm text-slate-700">{agent.avg_csat_score.toFixed(1)}</td>
                          <td className="py-3 px-2 text-sm text-slate-600">{agent.total_calls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">No agent performance data available</div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center">
                <Building2 size={18} className="mr-2 text-blue-600" /> Brand Intelligence
              </h3>
              {brandIntelligence.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {brandIntelligence.map((brand, idx) => (
                    <div key={`${brand.brand_name}-${idx}`} className="brand-item p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="brand-header flex justify-between items-center mb-2">
                        <span className="brand-name text-sm font-bold text-slate-800 uppercase">{brand.brand_name}</span>
                        <span className={`brand-sentiment text-lg ${
                          (brand.avg_sentiment_score || 0) > 0 ? 'text-green-600' :
                          (brand.avg_sentiment_score || 0) < 0 ? 'text-red-600' : 'text-slate-400'
                        }`}>
                          {(brand.avg_sentiment_score || 0) > 0 ? ':+)' : (brand.avg_sentiment_score || 0) < 0 ? ':-(' : ':|'}
                        </span>
                      </div>
                      <div className="brand-stats flex gap-4 text-xs">
                        <span className="text-slate-600"><strong className="text-slate-800">{brand.total_mentions}</strong> mentions</span>
                        <span className="text-green-600">+{brand.positive_mentions}</span>
                        <span className="text-red-600">-{brand.negative_mentions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">No brand intelligence data available</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center">
                <TrendingUp size={18} className="mr-2 text-green-600" /> Sentiment Trends (7 Days)
              </h3>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="positive_calls" stroke="#22c55e" name="Positive" strokeWidth={2} />
                    <Line type="monotone" dataKey="negative_calls" stroke="#ef4444" name="Negative" strokeWidth={2} />
                    <Line type="monotone" dataKey="neutral_calls" stroke="#9ca3af" name="Neutral" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">No trends data available</div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center">
                <BarChart3 size={18} className="mr-2 text-purple-600" /> Topic Distribution
              </h3>
              {topicDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topicDistribution}
                      cx="50%"
                      cy="50%"
                      dataKey="value"
                      nameKey="name"
                      labelLine={false}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || '-'} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                    >
                      {topicDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">No topic distribution data available</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
