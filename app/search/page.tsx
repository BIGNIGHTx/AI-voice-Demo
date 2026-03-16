'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Search, Brain, Key, Filter, Loader2, AlertCircle, FileAudio, Calendar, User, Tag, Star, ArrowRight } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'semantic' | 'keyword'>('semantic');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
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
    
    setLoading(true);
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
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">🔍 Search</h1>
            <p className="text-slate-500">Search through call transcripts and analytics using AI-powered search</p>
          </div>

          {/* Search Box */}
          <div className="search-box bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            {/* Search Type Selector */}
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
            
            {/* Search Input */}
            <div className="search-input-group flex gap-3 mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  searchType === 'semantic' 
                    ? 'Search by meaning (e.g., "customer requested refund", "complaint about delivery")' 
                    : 'Search by keywords (e.g., "refund", "delivery", "complaint")'
                }
                className="flex-1 px-5 py-4 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button 
                onClick={handleSearch} 
                disabled={loading || !query.trim()}
                className="flex items-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-base hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? (
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

            {/* Search Type Info */}
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-600">
                <strong className="text-blue-600">💡 Tip:</strong> {
                  searchType === 'semantic' 
                    ? 'Semantic search understands the meaning and context of your query, even if exact words don\'t match.'
                    : 'Keyword search finds exact word matches in transcripts and analysis data.'
                }
              </p>
            </div>
          </div>

          {/* Filters */}
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

          {/* Results */}
          <div className="search-results">
            {loading && (
              <div className="text-center py-16">
                <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Searching...</p>
              </div>
            )}

            {!loading && hasSearched && results.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <AlertCircle size={40} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No results found</p>
                <p className="text-slate-400 text-sm mt-2">Try adjusting your search query or filters</p>
              </div>
            )}

            {!loading && !hasSearched && (
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
                        <a 
                          href={`/files/${result.audio_file_id}`}
                          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          <span>View Details</span>
                          <ArrowRight size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
