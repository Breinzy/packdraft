'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Contest } from '@/types';

interface AdminStats {
  totalProducts: number;
  sealedCount: number;
  gradedCount: number;
  leagueCount: number;
  portfolioCount: number;
  lastSync: string | null;
}

interface ActionResult {
  ok?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export default function AdminPanel({
  contest,
  stats,
}: {
  contest: Contest | null;
  stats: AdminStats;
}) {
  const [results, setResults] = useState<Record<string, ActionResult | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function runAction(action: string) {
    setLoading((l) => ({ ...l, [action]: true }));
    setResults((r) => ({ ...r, [action]: null }));
    try {
      const res = await fetch('/api/admin/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setResults((r) => ({ ...r, [action]: data }));
    } catch (err) {
      setResults((r) => ({ ...r, [action]: { error: String(err) } }));
    } finally {
      setLoading((l) => ({ ...l, [action]: false }));
    }
  }

  function statusColor(status: string) {
    if (status === 'registration') return '#9fc0e6';
    if (status === 'active') return '#34d399';
    if (status === 'complete') return '#94a3b8';
    return '#fbbf24';
  }

  const actions: { id: string; label: string; description: string; warn?: boolean }[] = [
    { id: 'tick', label: 'TICK STATUS', description: 'Transition contest statuses based on current time' },
    { id: 'create-contest', label: 'CREATE CONTEST', description: 'Create the next weekly contest (ticks first)' },
    { id: 'sync-prices', label: 'SYNC PRICES', description: 'Sync latest prices for all active products (~5 min)' },
    { id: 'import-products', label: 'IMPORT PRODUCTS', description: 'Run full product import from PokemonPriceTracker API', warn: true },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border py-3 px-4 md:py-4 md:px-16 flex items-center justify-between bg-background/90 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #6e9bcf, #b0c4de)' }}
            >
              ⚡
            </div>
            <span className="text-base font-bold tracking-[0.15em] text-white">PACKDRAFT</span>
          </Link>
          <span className="text-xs tracking-wider text-yellow-400 border border-yellow-400/40 rounded px-2 py-0.5">
            ADMIN
          </span>
        </div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-white tracking-wider transition-colors">
          ← DASHBOARD
        </Link>
      </header>

      <main className="px-4 md:px-6 py-6 md:py-8 max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'TOTAL PRODUCTS', value: stats.totalProducts },
            { label: 'SEALED', value: stats.sealedCount },
            { label: 'GRADED', value: stats.gradedCount },
            { label: 'LEAGUES', value: stats.leagueCount },
            { label: 'PORTFOLIOS', value: stats.portfolioCount },
            {
              label: 'LAST SYNC',
              value: stats.lastSync
                ? new Date(stats.lastSync).toLocaleString()
                : 'Never',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3"
            >
              <div className="text-[10px] text-slate-600 tracking-widest mb-1">{stat.label}</div>
              <div className="text-base font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Current contest */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-5">
          <div className="text-xs text-slate-600 tracking-widest mb-3">CURRENT CONTEST</div>
          {contest ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex gap-3">
                <span className="text-slate-600 w-28">STATUS</span>
                <span style={{ color: statusColor(contest.status) }} className="font-bold tracking-wider">
                  {contest.status.toUpperCase()}
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-slate-600 w-28">STARTS</span>
                <span className="text-slate-300">{new Date(contest.starts_at).toLocaleString()}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-slate-600 w-28">ENDS</span>
                <span className="text-slate-300">{new Date(contest.ends_at).toLocaleString()}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-slate-600 w-28">ID</span>
                <span className="text-slate-500 font-mono text-xs">{contest.id}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600 tracking-wider">NO CONTEST — use CREATE CONTEST below</div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="text-xs text-slate-600 tracking-widest mb-2">ACTIONS</div>
          {actions.map((action) => (
            <div
              key={action.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3"
            >
              <div className="flex-1">
                <div className="text-sm font-bold tracking-wider text-white">{action.label}</div>
                <div className="text-xs text-slate-600 mt-0.5">{action.description}</div>
              </div>

              <button
                onClick={() => runAction(action.id)}
                disabled={loading[action.id]}
                className="px-5 py-2.5 rounded-lg text-sm font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                style={
                  action.warn
                    ? { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }
                    : { background: 'rgba(110,155,207,0.1)', border: '1px solid rgba(110,155,207,0.3)', color: '#9fc0e6' }
                }
              >
                {loading[action.id] ? 'RUNNING...' : 'RUN'}
              </button>

              {results[action.id] && (
                <div
                  className="w-full mt-1 text-xs rounded-lg px-4 py-3 font-mono break-all"
                  style={
                    results[action.id]?.error
                      ? { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }
                      : { background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }
                  }
                >
                  {JSON.stringify(results[action.id], null, 2)}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
