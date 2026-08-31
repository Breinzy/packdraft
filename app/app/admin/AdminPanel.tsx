'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tournament } from '@/types';
import StatusBadge from '@/components/tournament/StatusBadge';

interface AdminStats {
  totalAssets: number;
  sealedCount: number;
  gradedCount: number;
  snapshotCount: number;
  lastSync: string | null;
}

interface ActionResult {
  ok?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export default function AdminPanel({
  stats,
  tournaments,
}: {
  stats: AdminStats;
  tournaments: Tournament[];
}) {
  const [results, setResults] = useState<Record<string, ActionResult | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [name, setName] = useState('Weekly Pokémon');
  const [description, setDescription] = useState('Highest virtual portfolio wins.');
  const [budget, setBudget] = useState('10000');
  const [days, setDays] = useState('7');
  const [settleId, setSettleId] = useState(tournaments[0]?.id ?? '');

  async function runAction(action: string, extra?: Record<string, unknown>) {
    setLoading((l) => ({ ...l, [action]: true }));
    setResults((r) => ({ ...r, [action]: null }));
    try {
      const res = await fetch('/api/admin/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      setResults((r) => ({ ...r, [action]: data }));
    } catch (err) {
      setResults((r) => ({ ...r, [action]: { error: String(err) } }));
    } finally {
      setLoading((l) => ({ ...l, [action]: false }));
    }
  }

  const actions: { id: string; label: string; description: string; warn?: boolean }[] = [
    { id: 'sync-prices', label: 'SYNC PRICES', description: 'Insert latest Packdraft snapshots for active assets' },
    {
      id: 'import-assets',
      label: 'IMPORT ASSETS',
      description: 'Normalize PokemonPriceTracker catalog into assets + snapshots',
      warn: true,
    },
    { id: 'tick-tournaments', label: 'TICK TOURNAMENTS', description: 'Advance lifecycle and settle locked books' },
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border py-3 px-4 md:py-4 md:px-16 flex items-center justify-between bg-background/90 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 min-h-11">
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
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-white tracking-wider min-h-11 inline-flex items-center">
          ← DASHBOARD
        </Link>
      </header>

      <main className="px-4 md:px-6 py-6 md:py-8 max-w-4xl mx-auto space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'ACTIVE ASSETS', value: stats.totalAssets },
            { label: 'SEALED', value: stats.sealedCount },
            { label: 'GRADED', value: stats.gradedCount },
            { label: 'SNAPSHOTS', value: stats.snapshotCount },
            {
              label: 'LAST SYNC',
              value: stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never',
            },
            { label: 'TOURNAMENTS', value: tournaments.length },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3">
              <div className="text-[10px] text-slate-600 tracking-widest mb-1">{stat.label}</div>
              <div className="text-base font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="text-xs text-slate-600 tracking-widest mb-2">MARKET DATA</div>
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
                className="px-5 py-2.5 min-h-11 rounded-lg text-sm font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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

        <div className="space-y-3">
          <div className="text-xs text-slate-600 tracking-widest">CREATE TOURNAMENT</div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full min-h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 text-white"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="w-full min-h-20 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-500 tracking-wider">
                BUDGET
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-1 w-full min-h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 text-white"
                />
              </label>
              <label className="text-xs text-slate-500 tracking-wider">
                DAYS
                <input
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="mt-1 w-full min-h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 text-white"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() =>
                runAction('create-tournament', {
                  name,
                  description,
                  startingBudget: Number(budget),
                  durationDays: Number(days),
                })
              }
              disabled={loading['create-tournament']}
              className="px-5 py-2.5 min-h-11 rounded-lg text-sm font-bold tracking-widest text-white disabled:opacity-50"
              style={{ background: 'rgba(110,155,207,0.2)', border: '1px solid rgba(110,155,207,0.4)' }}
            >
              {loading['create-tournament'] ? 'CREATING…' : 'CREATE'}
            </button>
            {results['create-tournament'] ? (
              <div className="text-xs font-mono text-green break-all">
                {JSON.stringify(results['create-tournament'])}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-slate-600 tracking-widest">SETTLE ONE</div>
          <div className="flex flex-col md:flex-row gap-2">
            <select
              value={settleId}
              onChange={(e) => setSettleId(e.target.value)}
              className="flex-1 min-h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 text-sm text-slate-300"
            >
              <option value="">Select tournament</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!settleId || loading['settle-tournament']}
              onClick={() => runAction('settle-tournament', { tournamentId: settleId })}
              className="px-5 min-h-11 rounded-lg text-sm font-bold tracking-widest text-gold disabled:opacity-40"
              style={{ border: '1px solid rgba(251,191,36,0.3)' }}
            >
              SETTLE
            </button>
          </div>
          {results['settle-tournament'] ? (
            <div className="text-xs font-mono break-all text-slate-400">
              {JSON.stringify(results['settle-tournament'])}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="text-xs text-slate-600 tracking-widest">TOURNAMENTS</div>
          {tournaments.length === 0 ? (
            <p className="text-sm text-slate-500">None yet. Apply the Phase 5–10 migration, then create one.</p>
          ) : (
            tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="flex items-center justify-between gap-3 bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3"
              >
                <span className="text-sm text-white truncate">{t.name}</span>
                <StatusBadge status={t.status} />
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
