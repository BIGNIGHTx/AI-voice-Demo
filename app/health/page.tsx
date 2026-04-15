'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Activity, CheckCircle2, XCircle, RefreshCw, Clock3 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface EndpointCheck {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  body?: Record<string, unknown>;
}

interface CheckResult {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  ok: boolean;
  status: number;
  durationMs: number;
  message: string;
  updatedAt: string;
}

const ENDPOINTS: EndpointCheck[] = [
  { name: 'AI Status', path: '/api/v1/ai/ai-status', method: 'GET' },
  { name: 'Audio List', path: '/api/v1/audio/list?page=1&per_page=1', method: 'GET' },
  { name: 'Analytics Trends', path: '/api/v1/analytics/trends', method: 'GET' },
  { name: 'Topic Distribution', path: '/api/v1/analytics/topic-distribution', method: 'GET' },
  { name: 'Agent Performance', path: '/api/v1/analytics/agent-performance', method: 'GET' },
  { name: 'Brand Intelligence', path: '/api/v1/analytics/brand-intelligence', method: 'GET' },
  { name: 'Search Keyword', path: '/api/v1/search/keyword', method: 'POST', body: { query: 'test', filters: {} } },
  { name: 'Search Semantic', path: '/api/v1/search/semantic', method: 'POST', body: { query: 'test', filters: {} } }
];

export default function HealthPage() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [checking, setChecking] = useState(false);

  const runChecks = useCallback(async () => {
    setChecking(true);
    const settled = await Promise.all(
      ENDPOINTS.map(async (endpoint): Promise<CheckResult> => {
        const started = performance.now();
        try {
          const response = await fetch(`${API_BASE}${endpoint.path}`, {
            method: endpoint.method,
            headers: endpoint.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
            body: endpoint.method === 'POST' ? JSON.stringify(endpoint.body || {}) : undefined,
            cache: 'no-store'
          });
          const duration = Math.round(performance.now() - started);
          const endpointReachable = response.status < 500;
          return {
            name: endpoint.name,
            path: endpoint.path,
            method: endpoint.method,
            ok: endpointReachable,
            status: response.status,
            durationMs: duration,
            message: endpointReachable ? (response.ok ? 'OK' : `Reachable (HTTP ${response.status})`) : `HTTP ${response.status}`,
            updatedAt: new Date().toISOString()
          };
        } catch (error: unknown) {
          const duration = Math.round(performance.now() - started);
          return {
            name: endpoint.name,
            path: endpoint.path,
            method: endpoint.method,
            ok: false,
            status: 0,
            durationMs: duration,
            message: error instanceof Error ? error.message : 'Network error',
            updatedAt: new Date().toISOString()
          };
        }
      })
    );

    setResults(settled);
    setChecking(false);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void runChecks();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [runChecks]);

  const summary = useMemo(() => {
    const ok = results.filter((r) => r.ok).length;
    const failed = results.length - ok;
    return { ok, failed, total: results.length };
  }, [results]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-slate-800 sm:text-3xl">
                <Activity size={28} className="text-blue-600" /> Health Check
              </h1>
              <p className="text-slate-500">ตรวจสถานะ API ทุก endpoint ที่หน้า frontend ใช้งานจริง</p>
            </div>

            <button
              onClick={runChecks}
              disabled={checking}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
              {checking ? 'Checking...' : 'Run Check Again'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4">
              <p className="text-xs uppercase text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4">
              <p className="text-xs uppercase text-emerald-600">Healthy</p>
              <p className="text-2xl font-bold text-emerald-700">{summary.ok}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4">
              <p className="text-xs uppercase text-red-600">Failed</p>
              <p className="text-2xl font-bold text-red-700">{summary.failed}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                  <th className="p-4">Endpoint</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Response</th>
                  <th className="p-4">Latency</th>
                  <th className="p-4">Updated</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.path} className="border-b border-slate-50 text-sm">
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{result.name}</p>
                      <p className="text-xs text-slate-500">{result.path}</p>
                    </td>
                    <td className="p-4 text-slate-600">{result.method}</td>
                    <td className="p-4">
                      {result.ok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 size={16} /> UP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                          <XCircle size={16} /> DOWN
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-700">{result.status || '-'} ({result.message})</td>
                    <td className="p-4 text-slate-700">{result.durationMs}ms</td>
                    <td className="p-4 text-xs text-slate-500 inline-flex items-center gap-1">
                      <Clock3 size={13} /> {new Date(result.updatedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
