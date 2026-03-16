'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Building2, Loader2, AlertCircle, TriangleAlert } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#ffc0cb', '#90EE90'];

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
  avg_qa_score: number;
  avg_csat_score: number;
}

interface BrandRow {
  brand_name: string;
  total_mentions: number;
  positive_mentions: number;
  negative_mentions: number;
  avg_sentiment_score?: number;
}

interface AnalyticsState {
  trends: TrendRow[];
  topicDistribution: TopicRow[];
  agentPerformance: AgentRow[];
  brandIntelligence: BrandRow[];
}

interface EndpointStatus {
  ok: boolean;
  statusCode?: number;
  message?: string;
}

type EndpointStatusMap = Record<string, EndpointStatus>;

const INITIAL_ANALYTICS: AnalyticsState = {
  trends: [],
  topicDistribution: [],
  agentPerformance: [],
  brandIntelligence: []
};

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

const toText = (value: unknown, fallback = '-'): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

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
      return { agent_id: `Agent ${index + 1}`, avg_qa_score: 0, avg_csat_score: 0 };
    }
    return {
      agent_id: toText(item.agent_id ?? item.agent_name ?? item.name, `Agent ${index + 1}`),
      avg_qa_score: toNum(item.avg_qa_score ?? item.qa_score),
      avg_csat_score: toNum(item.avg_csat_score ?? item.csat_score)
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

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsState>(INITIAL_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointStatus, setEndpointStatus] = useState<EndpointStatusMap>({});

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpointNames = [
        '/api/v1/analytics/trends',
        '/api/v1/analytics/topic-distribution',
        '/api/v1/analytics/agent-performance',
        '/api/v1/analytics/brand-intelligence'
      ];

      const [trendsResult, topicResult, agentResult, brandResult] = await Promise.allSettled([
        fetchJson(`${API_BASE}/api/v1/analytics/trends`),
        fetchJson(`${API_BASE}/api/v1/analytics/topic-distribution`),
        fetchJson(`${API_BASE}/api/v1/analytics/agent-performance`),
        fetchJson(`${API_BASE}/api/v1/analytics/brand-intelligence`)
      ]);

      setEndpointStatus(normalizeEndpointStatuses(endpointNames, [trendsResult, topicResult, agentResult, brandResult]));

      setAnalytics({
        trends: normalizeTrends(trendsResult.status === 'fulfilled' ? trendsResult.value : []),
        topicDistribution: normalizeTopics(topicResult.status === 'fulfilled' ? topicResult.value : []),
        agentPerformance: normalizeAgents(agentResult.status === 'fulfilled' ? agentResult.value : []),
        brandIntelligence: normalizeBrands(brandResult.status === 'fulfilled' ? brandResult.value : [])
      });

      const failedCount = [trendsResult, topicResult, agentResult, brandResult].filter(r => r.status === 'rejected').length;
      if (failedCount === 4) {
        throw new Error('All analytics endpoints failed');
      }
    } catch {
      setError('Failed to load analytics data. Please check if the backend is running.');
      setAnalytics(INITIAL_ANALYTICS);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading Analytics Dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button 
              onClick={fetchAnalytics}
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">📊 Analytics Dashboard</h1>
            <p className="text-slate-500">Comprehensive insights into call analytics and performance metrics</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp size={24} className="text-green-600" />
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">TRENDS</span>
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Calls (7 days)</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {analytics.trends.reduce((sum, d) => sum + d.positive_calls + d.negative_calls + d.neutral_calls, 0)}
              </p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <PieChartIcon size={24} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">TOPICS</span>
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Categories</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{analytics.topicDistribution.length}</p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <BarChart3 size={24} className="text-purple-600" />
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">AGENTS</span>
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Active Agents</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{analytics.agentPerformance.length}</p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <Building2 size={24} className="text-orange-600" />
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">BRANDS</span>
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Brands Tracked</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{analytics.brandIntelligence.length}</p>
            </div>
          </div>

          {Object.entries(endpointStatus).some(([, status]) => !status.ok) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TriangleAlert size={16} className="text-amber-600" />
                <p className="text-sm font-bold text-amber-800">บาง endpoint โหลดไม่สำเร็จ</p>
              </div>
              <ul className="text-xs text-amber-700 space-y-1">
                {Object.entries(endpointStatus)
                  .filter(([, status]) => !status.ok)
                  .map(([name, status]) => (
                    <li key={name}>
                      {name} - {status.statusCode ? `HTTP ${status.statusCode}` : status.message || 'failed'}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          
          <div className="analytics-grid">
            {/* Sentiment Trends - Full Width */}
            <div className="chart-card full-width bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <TrendingUp size={20} className="mr-2 text-green-600" />
                📈 Sentiment Trends (7 Days)
              </h2>
              {analytics.trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={analytics.trends}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="positive_calls" stroke="#22c55e" name="Positive" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="negative_calls" stroke="#ef4444" name="Negative" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="neutral_calls" stroke="#9ca3af" name="Neutral" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No trends data available
                </div>
              )}
            </div>
            
            {/* Topic Distribution */}
            <div className="chart-card bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <PieChartIcon size={20} className="mr-2 text-blue-600" />
                📊 Topic Distribution
              </h2>
              {analytics.topicDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={analytics.topicDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || '-'} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                    >
                      {analytics.topicDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No topic data available
                </div>
              )}
            </div>
            
            {/* Agent Performance */}
            <div className="chart-card bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <BarChart3 size={20} className="mr-2 text-purple-600" />
                🏆 Top 10 Agents Performance
              </h2>
              {analytics.agentPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.agentPerformance.slice(0, 10)}>
                    <XAxis dataKey="agent_id" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg_qa_score" fill="#4f46e5" name="QA Score" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avg_csat_score" fill="#22c55e" name="CSAT" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No agent performance data available
                </div>
              )}
            </div>
            
            {/* Brand Intelligence - Full Width */}
            <div className="chart-card full-width bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <Building2 size={20} className="mr-2 text-orange-600" />
                🏢 Brand Intelligence
              </h2>
              {analytics.brandIntelligence.length > 0 ? (
                <div className="brand-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.brandIntelligence.map((brand, idx) => {
                    const avgScore = brand.avg_sentiment_score ?? 0;
                    return (
                    <div key={brand.brand_name || idx} className="brand-card p-5 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-md transition-shadow">
                      <div className="brand-header flex justify-between items-center mb-4">
                        <h3 className="text-base font-bold text-slate-800 uppercase">
                          {brand.brand_name}
                        </h3>
                        <span className={`sentiment-badge text-xl ${
                          avgScore > 0 ? 'text-green-600' : 
                          avgScore < 0 ? 'text-red-600' : 'text-slate-400'
                        }`}>
                          {avgScore > 0 ? '😊' : avgScore < 0 ? '😠' : '😐'}
                        </span>
                      </div>
                      <div className="brand-stats space-y-2">
                        <div className="stat flex justify-between items-center">
                          <span className="label text-xs text-slate-500">Total Mentions</span>
                          <span className="value text-sm font-bold text-slate-800">{brand.total_mentions}</span>
                        </div>
                        <div className="stat flex justify-between items-center">
                          <span className="label text-xs text-slate-500">Positive</span>
                          <span className="value text-sm font-bold text-green-600">+{brand.positive_mentions}</span>
                        </div>
                        <div className="stat flex justify-between items-center">
                          <span className="label text-xs text-slate-500">Negative</span>
                          <span className="value text-sm font-bold text-red-600">-{brand.negative_mentions}</span>
                        </div>
                        {brand.avg_sentiment_score !== undefined && (
                          <div className="stat flex justify-between items-center pt-2 border-t border-slate-200">
                            <span className="label text-xs text-slate-500">Avg Sentiment</span>
                            <span className={`value text-sm font-bold ${
                              avgScore > 0 ? 'text-green-600' : 
                              avgScore < 0 ? 'text-red-600' : 'text-slate-600'
                            }`}>
                              {avgScore.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No brand intelligence data available
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
