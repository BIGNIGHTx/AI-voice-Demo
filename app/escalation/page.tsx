'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  Loader2, AlertCircle, PhoneForwarded, Users,
  TrendingDown, Activity, ChevronUp, ChevronDown,
  RefreshCw, ShieldAlert, UserCheck, Circle
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface EscalationSummary {
  total_calls: number;
  escalation: {
    total_escalated: number;
    escalation_rate: number;
    non_escalated: number;
  };
  customer_status_distribution: {
    green:  { count: number; percentage: number; label: string };
    yellow: { count: number; percentage: number; label: string };
    red:    { count: number; percentage: number; label: string };
  };
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    positive_rate: number;
    negative_rate: number;
  };
  quality: {
    avg_csat: number;
    avg_qa: number;
    low_csat_calls: number;
    high_csat_calls: number;
  };
  top_escalating_agents: {
    agent_id: string;
    agent_name: string;
    total_calls: number;
    escalated_calls: number;
    escalation_rate: number;
  }[];
}

interface AgentEscalation {
  agent_id: string;
  agent_name: string;
  agent_status_color: 'green' | 'yellow' | 'red';
  agent_status_label: string;
  escalation_rate: number;
  escalation_count: number;
  total_calls: number;
  avg_csat: number;
  avg_qa: number;
  performance_score: number;
  recommendations: string[];
  needs_coaching: boolean;
}

// ─────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────

const StatusDot = ({ color }: { color: 'green' | 'yellow' | 'red' }) => {
  const cls = {
    green:  'bg-emerald-500 shadow-emerald-300',
    yellow: 'bg-amber-400 shadow-amber-200',
    red:    'bg-red-500 shadow-red-300',
  }[color];
  return <span className={`inline-block w-3 h-3 rounded-full shadow-md ${cls}`} />;
};

const StatusBadge = ({ color, label }: { color: 'green' | 'yellow' | 'red'; label: string }) => {
  const cls = {
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    yellow: 'bg-amber-50  text-amber-700  border-amber-200',
    red:    'bg-red-50    text-red-700    border-red-200',
  }[color];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <StatusDot color={color} />
      {label}
    </span>
  );
};

const ScoreBar = ({ value, max = 100, color }: { value: number; max?: number; color: string }) => (
  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-700 ${color}`}
      style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
    />
  </div>
);

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function EscalationPage() {
  const [summary, setSummary]   = useState<EscalationSummary | null>(null);
  const [agents, setAgents]     = useState<AgentEscalation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [days, setDays]         = useState(30);
  const [sortBy, setSortBy]     = useState<'performance_score' | 'escalation_rate'>('escalation_rate');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, agentRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/escalation/summary?days=${days}`).then(r => r.json()),
        fetch(`${API_BASE}/api/v1/escalation/agent-performance?days=${days}&limit=30`).then(r => r.json()),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value as EscalationSummary);
      if (agentRes.status === 'fulfilled') {
        const arr = Array.isArray(agentRes.value) ? agentRes.value : [];
        setAgents(arr as AgentEscalation[]);
      }

      if (sumRes.status === 'rejected' && agentRes.status === 'rejected') {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }
    } catch {
      setError('ไม่สามารถโหลดข้อมูล Escalation กรุณาตรวจสอบ Backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  const sortedAgents = [...agents].sort((a, b) => {
    const va = a[sortBy]; const vb = b[sortBy];
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  // ── Loading ──
  if (loading) return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={36} className="animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Loading Escalation data...</p>
        </div>
      </main>
    </div>
  );

  // ── Error ──
  if (error && !summary) return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle size={36} className="text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            ลองใหม่
          </button>
        </div>
      </main>
    </div>
  );

  const dist = summary?.customer_status_distribution;
  const esc  = summary?.escalation;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
        <div className="max-w-full mx-auto space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <PhoneForwarded size={22} className="text-red-500" />
                Call Escalation Dashboard
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Skill-based Routing · ระดับลูกค้า 🟢🟡🔴 · ประสิทธิภาพ Agent
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Days filter */}
              <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-[13px]">
                {([7, 14, 30, 90] as number[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-4 py-2 font-bold transition-colors cursor-pointer ${days === d ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'} ${d !== 90 ? 'border-r border-slate-100' : ''}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <button
                onClick={load}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition cursor-pointer text-slate-600 text-sm font-medium"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Calls',
                value: summary?.total_calls ?? 0,
                icon: Activity,
                color: 'text-blue-600', bg: 'bg-blue-50'
              },
              {
                label: 'Escalated',
                value: esc?.total_escalated ?? 0,
                sub: `${esc?.escalation_rate ?? 0}% ของทั้งหมด`,
                icon: PhoneForwarded,
                color: 'text-red-600', bg: 'bg-red-50'
              },
              {
                label: 'Avg CSAT',
                value: summary?.quality.avg_csat?.toFixed(1) ?? '-',
                sub: '(1–5)',
                icon: UserCheck,
                color: 'text-emerald-600', bg: 'bg-emerald-50'
              },
              {
                label: 'Avg QA Score',
                value: summary?.quality.avg_qa?.toFixed(1) ?? '-',
                sub: '(0–10)',
                icon: ShieldAlert,
                color: 'text-purple-600', bg: 'bg-purple-50'
              }
            ].map((s, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                  <s.icon size={20} />
                </div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
                {s.sub && <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* ── Customer Status Color Distribution ── */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Circle size={18} className="text-slate-400" />
              สถานะลูกค้า (Customer Status Color)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {dist && (
                <>
                  {/* GREEN */}
                  <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center">
                    <div className="text-5xl mb-2">🟢</div>
                    <p className="text-2xl font-black text-emerald-700">{dist.green.count}</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">ปกติ</p>
                    <p className="text-xs text-emerald-500 mt-0.5">{dist.green.percentage}% ของทั้งหมด</p>
                    <p className="text-xs text-slate-500 mt-2">Level 1 จัดการได้</p>
                    <ScoreBar value={dist.green.percentage} color="bg-emerald-400" />
                  </div>

                  {/* YELLOW */}
                  <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 text-center">
                    <div className="text-5xl mb-2">🟡</div>
                    <p className="text-2xl font-black text-amber-700">{dist.yellow.count}</p>
                    <p className="text-sm font-bold text-amber-600 mt-1">เริ่มมีปัญหา</p>
                    <p className="text-xs text-amber-500 mt-0.5">{dist.yellow.percentage}% ของทั้งหมด</p>
                    <p className="text-xs text-slate-500 mt-2">พิจารณาโอน Level 2</p>
                    <ScoreBar value={dist.yellow.percentage} color="bg-amber-400" />
                  </div>

                  {/* RED */}
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 text-center">
                    <div className="text-5xl mb-2">🔴</div>
                    <p className="text-2xl font-black text-red-700">{dist.red.count}</p>
                    <p className="text-sm font-bold text-red-600 mt-1">วิกฤต</p>
                    <p className="text-xs text-red-500 mt-0.5">{dist.red.percentage}% ของทั้งหมด</p>
                    <p className="text-xs text-slate-500 mt-2">โอน Level 2–3 ทันที</p>
                    <ScoreBar value={dist.red.percentage} color="bg-red-400" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Agent Escalation Performance ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                Agent Escalation Performance
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>เรียงตาม:</span>
                <button
                  onClick={() => toggleSort('escalation_rate')}
                  className={`px-3 py-1 rounded-lg border font-medium cursor-pointer transition ${sortBy === 'escalation_rate' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  อัตราโอนสาย {sortBy === 'escalation_rate' && (sortDir === 'desc' ? '↓' : '↑')}
                </button>
                <button
                  onClick={() => toggleSort('performance_score')}
                  className={`px-3 py-1 rounded-lg border font-medium cursor-pointer transition ${sortBy === 'performance_score' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  คะแนน {sortBy === 'performance_score' && (sortDir === 'desc' ? '↓' : '↑')}
                </button>
              </div>
            </div>

            {sortedAgents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase">Agent</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">สถานะ</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer" onClick={() => toggleSort('escalation_rate')}>
                        <span className="flex items-center justify-center gap-1">
                          อัตราโอนสาย
                          {sortBy === 'escalation_rate'
                            ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
                            : null}
                        </span>
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Calls</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">CSAT</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">QA</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer" onClick={() => toggleSort('performance_score')}>
                        <span className="flex items-center justify-center gap-1">
                          คะแนน
                          {sortBy === 'performance_score'
                            ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
                            : null}
                        </span>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">คำแนะนำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sortedAgents.map((agent, idx) => (
                      <tr
                        key={`${agent.agent_id}-${idx}`}
                        className={`hover:bg-slate-50 transition-colors ${agent.agent_status_color === 'red' ? 'bg-red-50/30' : agent.agent_status_color === 'yellow' ? 'bg-amber-50/20' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{agent.agent_name || agent.agent_id}</p>
                            <p className="text-xs text-slate-400">{agent.agent_id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge color={agent.agent_status_color} label={agent.agent_status_label.replace(/🟢|🟡|🔴/g, '').trim()} />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm font-black ${agent.escalation_rate >= 30 ? 'text-red-600' : agent.escalation_rate >= 15 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {agent.escalation_rate}%
                            </span>
                            <span className="text-xs text-slate-400">{agent.escalation_count}/{agent.total_calls}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-slate-700">{agent.total_calls}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-sm font-bold ${agent.avg_csat >= 4 ? 'text-emerald-600' : agent.avg_csat >= 3 ? 'text-slate-600' : 'text-red-600'}`}>
                            {agent.avg_csat.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-sm font-bold ${agent.avg_qa >= 7 ? 'text-emerald-600' : agent.avg_qa >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                            {agent.avg_qa.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center gap-1 min-w-[80px]">
                            <span className="text-sm font-black text-slate-700">{agent.performance_score}</span>
                            <ScoreBar value={agent.performance_score} color={agent.performance_score >= 70 ? 'bg-emerald-400' : agent.performance_score >= 50 ? 'bg-amber-400' : 'bg-red-400'} />
                          </div>
                        </td>
                        <td className="px-4 py-4 max-w-[200px]">
                          {agent.recommendations.slice(0, 1).map((rec, ri) => (
                            <p key={ri} className="text-xs text-slate-500 truncate">{rec}</p>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <TrendingDown size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">ไม่มีข้อมูล Agent ในช่วงเวลานี้</p>
              </div>
            )}
          </div>

          {/* ── Top Escalating Agents ── */}
          {summary && summary.top_escalating_agents.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                <PhoneForwarded size={18} className="text-red-500" />
                Agent ที่โอนสายบ่อยสุด (ต้องการ Coaching)
              </h3>
              <div className="space-y-3">
                {summary.top_escalating_agents.map((agent, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-red-50/50 rounded-xl border border-red-100">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-black text-sm flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{agent.agent_name || agent.agent_id}</p>
                      <p className="text-xs text-slate-500">{agent.escalated_calls} ครั้งที่โอน จาก {agent.total_calls} สาย</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-red-600">{agent.escalation_rate}%</p>
                      <p className="text-xs text-slate-400">escalation rate</p>
                    </div>
                    <div className="w-24">
                      <ScoreBar value={agent.escalation_rate} color="bg-red-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Agent Level Guide ── */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
              <ShieldAlert size={18} className="text-slate-500" />
              ระดับ Agent (Skill-based Routing)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  level: 1, icon: '🟢', name: 'Level 1 — ด่านแรก',
                  desc: 'รับสายทั่วไป ตอบคำถามพื้นฐาน',
                  skills: ['สอบถามทั่วไป', 'ราคาสินค้า', 'ข้อมูลเบื้องต้น'],
                  bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700'
                },
                {
                  level: 2, icon: '🟡', name: 'Level 2 — ผู้เชี่ยวชาญ',
                  desc: 'รับเคสยาก แก้ปัญหาซับซ้อน',
                  skills: ['ร้องเรียน', 'เคลม', 'จัดส่ง', 'เทคนิค'],
                  bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700'
                },
                {
                  level: 3, icon: '🔴', name: 'Level 3 — Supervisor',
                  desc: 'มีอำนาจตัดสินใจ จัดการเคสวิกฤต',
                  skills: ['ขอคืนเงิน', 'ลดราคา', 'ลูกค้าโกรธ', 'เคสสำคัญ'],
                  bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700'
                }
              ].map(lv => (
                <div key={lv.level} className={`rounded-xl p-5 border-2 ${lv.bg} ${lv.border}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{lv.icon}</span>
                    <div>
                      <p className={`text-sm font-bold ${lv.text}`}>{lv.name}</p>
                      <p className="text-xs text-slate-500">{lv.desc}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lv.skills.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-white rounded-full text-xs text-slate-600 border border-slate-200 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
