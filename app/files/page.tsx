'use client';

import Sidebar from '@/components/Sidebar';
import {
  Search,
  RotateCw,
  Calendar,
  Tag,
  CheckCircle2,
  RefreshCw,
  FileAudio,
  AlertCircle,
  Brain,
  Key,
  Filter,
  Loader2,
  User,
  Star,
  ArrowRight
} from 'lucide-react';
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

interface FilterOptions {
  brands: string[];
  topics: string[];
}

interface SearchResult {
  audio_file_id?: string;
  file_name?: string;
  sentiment?: string;
  customer_phone?: string;
  agent_id?: string;
  topic?: string;
  qa_score?: number;
  call_date?: string;
  highlight?: string;
  summary?: string;
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

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'semantic' | 'keyword'>('semantic');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ brands: [], topics: [] });
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [filters, setFilters] = useState({
    brand: '',
    sentiment: '',
    topic: '',
    dateFrom: '',
    dateTo: ''
  });

  const perPage = 10;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
      if (fileSearch) params.set('search', fileSearch);
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
  }, [page, fileSearch]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      setLoadingFilters(true);
      try {
        const [brandRes, topicRes, filesRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/v1/analytics/brand-intelligence`, { cache: 'no-store' }),
          fetch(`${API_BASE}/api/v1/analytics/topic-distribution`, { cache: 'no-store' }),
          fetch(`${API_BASE}/api/v1/audio/list?page=1&per_page=500`, { cache: 'no-store' })
        ]);

        const brands = new Set<string>();
        const topics = new Set<string>();

        if (brandRes.status === 'fulfilled' && brandRes.value.ok) {
          const payload = await brandRes.value.json();
          const items = toArray(payload, ['brand_intelligence', 'brands', 'data', 'items']);
          for (const item of items) {
            if (!isObject(item)) continue;
            const brand = toText(item.brand_name ?? item.brand ?? item.name);
            if (brand) brands.add(brand.toUpperCase());
          }
        }

        if (topicRes.status === 'fulfilled' && topicRes.value.ok) {
          const payload = await topicRes.value.json();
          const items = toArray(payload, ['topic_distribution', 'topics', 'data', 'items']);
          for (const item of items) {
            if (!isObject(item)) continue;
            const topic = toText(item.name ?? item.topic ?? item.category);
            if (topic) topics.add(topic);
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
          brands: Array.from(brands).sort((a, b) => a.localeCompare(b)),
          topics: Array.from(topics).sort((a, b) => a.localeCompare(b))
        });
      } catch {
        setFilterOptions({ brands: [], topics: [] });
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilterOptions();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearchLoading(true);
    setHasSearched(true);
    try {
      const endpoint = searchType === 'semantic'
        ? '/api/v1/search/semantic'
        : '/api/v1/search/keyword';

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          filters
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      brand: '',
      sentiment: '',
      topic: '',
      dateFrom: '',
      dateTo: ''
    });
  };

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

          <div className="space-y-6 mb-8">
            <div className="mb-2">
              <h2 className="text-2xl font-semibold text-slate-800">Advanced Search</h2>
              <p className="text-slate-500 text-sm">Search through call transcripts and analytics from the Files page</p>
            </div>

            <div className="search-box bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="search-type-selector flex gap-3 mb-6">
                <button
                  className={`flex items-center space-x-2 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer border-2 ${
                    searchType === 'semantic'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSearchType('semantic')}
                >
                  <Brain size={18} />
                  <span>Semantic Search</span>
                </button>
                <button
                  className={`flex items-center space-x-2 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer border-2 ${
                    searchType === 'keyword'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSearchType('keyword')}
                >
                  <Key size={18} />
                  <span>Keyword Search</span>
                </button>
              </div>

              <div className="search-input-group flex gap-3 mb-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  placeholder={
                    searchType === 'semantic'
                      ? 'Search by meaning (e.g., "customer requested refund", "complaint about delivery")'
                      : 'Search by keywords (e.g., "refund", "delivery", "complaint")'
                  }
                  className="flex-1 px-5 py-4 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || !query.trim()}
                  className="flex items-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-base hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {searchLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      <span>Search</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-600">
                  <strong className="text-blue-600">Tip:</strong>{' '}
                  {searchType === 'semantic'
                    ? 'Semantic search understands the meaning and context of your query, even if exact words do not match.'
                    : 'Keyword search finds exact word matches in transcripts and analysis data.'}
                </p>
              </div>
            </div>

            <div className="search-filters bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Filter size={18} className="text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Filters</h3>
                </div>
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select
                  value={filters.brand}
                  onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                  className="px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
                >
                  <option value="">All Brands</option>
                  {filterOptions.brands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>

                <select
                  value={filters.sentiment}
                  onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                  className="px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
                >
                  <option value="">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>

                <select
                  value={filters.topic}
                  onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
                  className="px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
                >
                  <option value="">All Topics</option>
                  {filterOptions.topics.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                />

                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>
              {loadingFilters && (
                <p className="text-[11px] text-slate-400 mt-3">Loading filter options from API...</p>
              )}
            </div>

            <div className="search-results">
              {searchLoading && (
                <div className="text-center py-16">
                  <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Searching...</p>
                </div>
              )}

              {!searchLoading && hasSearched && results.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                  <AlertCircle size={40} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No results found</p>
                  <p className="text-slate-400 text-sm mt-2">Try adjusting your search query or filters</p>
                </div>
              )}

              {!searchLoading && !hasSearched && (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                  <Search size={40} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Start your search</p>
                  <p className="text-slate-400 text-sm mt-2">Enter a query above to search through call data</p>
                </div>
              )}

              {results.length > 0 && (
                <>
                  <div className="results-count mb-4">
                    <p className="text-sm font-bold text-slate-600">
                      Found <span className="text-blue-600">{results.length}</span> result{results.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {results.map((result, idx) => (
                      <div key={result.audio_file_id || idx} className="result-card bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="result-header flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            <FileAudio size={20} className="text-blue-600" />
                            <span className="file-name text-sm font-bold text-slate-800">
                              {result.file_name || result.audio_file_id}
                            </span>
                          </div>
                          <span className={`sentiment-badge px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            result.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                            result.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {result.sentiment || 'Unknown'}
                          </span>
                        </div>

                        <div className="result-meta flex flex-wrap gap-4 mb-4 text-xs text-slate-500">
                          {result.customer_phone && (
                            <span className="flex items-center space-x-1">
                              <User size={14} />
                              <span>{result.customer_phone}</span>
                            </span>
                          )}
                          {result.agent_id && (
                            <span className="flex items-center space-x-1">
                              <User size={14} />
                              <span>Agent: {result.agent_id}</span>
                            </span>
                          )}
                          {result.topic && (
                            <span className="flex items-center space-x-1">
                              <Tag size={14} />
                              <span>{result.topic}</span>
                            </span>
                          )}
                          {result.qa_score && (
                            <span className="flex items-center space-x-1">
                              <Star size={14} className="text-yellow-500" />
                              <span>QA: {result.qa_score.toFixed(1)}</span>
                            </span>
                          )}
                          {result.call_date && (
                            <span className="flex items-center space-x-1">
                              <Calendar size={14} />
                              <span>{new Date(result.call_date).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>

                        {result.highlight && (
                          <div
                            className="result-highlight bg-yellow-50 p-4 rounded-xl mb-4 text-sm text-slate-700"
                            dangerouslySetInnerHTML={{ __html: result.highlight }}
                          />
                        )}

                        {result.summary && (
                          <div className="result-summary bg-slate-50 p-4 rounded-xl mb-4 text-sm text-slate-700">
                            {result.summary}
                          </div>
                        )}

                        <div className="result-actions flex gap-2">
                          <button
                            onClick={() => result.audio_file_id && router.push(`/files/${result.audio_file_id}`)}
                            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            <span>View Details</span>
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
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
                <p className="text-xs text-slate-500">Quick filter for file list only</p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex-1 md:w-96 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Filter files by name, customer, brand, agent..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                    value={fileSearch}
                    onChange={(e) => { setFileSearch(e.target.value); setPage(1); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchFiles(); }}
                  />
                </div>
                <button
                  onClick={fetchFiles}
                  className="p-2.5 bg-slate-50 text-slate-500 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <RotateCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

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
                        <span className="font-medium text-slate-800 text-sm truncate max-w-52">{file.name}</span>
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
          </section>
        </div>
      </main>
    </div>
  );
}
