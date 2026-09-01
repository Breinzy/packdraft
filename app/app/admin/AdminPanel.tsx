'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/brand/Logo';
import type { Tournament } from '@/types';
import type { MarketJobState } from '@/lib/market/job-state';
import StatusBadge from '@/components/tournament/StatusBadge';
import { formatTimestamp } from '@/lib/utils';

interface AdminStats {
  totalAssets: number;
  sealedCount: number;
  singlesCount: number;
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
  importJob,
}: {
  stats: AdminStats;
  tournaments: Tournament[];
  importJob: MarketJobState | null;
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
      label: 'IMPORT CATALOG CHUNK',
      description: 'Resume full PPT ingest. Stops at ~4 minutes, PPT credits, or daily remaining.',
      warn: true,
    },
    { id: 'pause-import', label: 'PAUSE IMPORT', description: 'Stop cron/admin from continuing the catalog job' },
    { id: 'resume-import', label: 'RESUME IMPORT', description: 'Allow the next chunk to run from the saved cursor' },
    { id: 'tick-tournaments', label: 'TICK TOURNAMENTS', description: 'Advance lifecycle and settle locked books' },
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border py-3 px-4 md:px-12 flex items-center justify-between bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Logo href="/" />
          <span className="kicker border border-gold/40 text-gold px-1.5 py-0.5">Admin</span>
        </div>
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground min-h-11 inline-flex items-center">
          ← Dashboard
        </Link>
      </header>

      <main className="px-4 md:px-6 py-6 md:py-8 max-w-4xl mx-auto space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'ACTIVE ASSETS', value: stats.totalAssets },
            { label: 'SEALED', value: stats.sealedCount },
            { label: 'SINGLES', value: stats.singlesCount },
            { label: 'GRADED', value: stats.gradedCount },
            { label: 'SNAPSHOTS', value: stats.snapshotCount },
            {
              label: 'LAST SYNC',
              value: stats.lastSync ? formatTimestamp(stats.lastSync) : 'Never',
            },
            { label: 'TOURNAMENTS', value: tournaments.length },
          ].map((stat) => (
            <div key={stat.label} className="panel px-4 py-3">
              <div className="kicker mb-1">{stat.label}</div>
              <div className="text-base font-bold text-foreground">{stat.value}</div>
            </div>
          ))}
        </div>

        {importJob ? (
          <div className="panel p-4 space-y-2">
            <div className="kicker">Catalog import</div>
            <div className="text-sm text-foreground">
              {importJob.status.toUpperCase()} · stage {importJob.stage}
              {importJob.stop_reason ? ` · last stop: ${importJob.stop_reason}` : ''}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted">
              <div>Sealed {importJob.sealed_imported}</div>
              <div>Singles {importJob.singles_imported}</div>
              <div>Graded {importJob.graded_imported}</div>
              <div>Snapshots {importJob.snapshots_written}</div>
              <div>Credits used {importJob.credits_used}</div>
              <div>Daily remaining {importJob.daily_remaining ?? '—'}</div>
              <div>Set index {importJob.set_index}</div>
              <div>Graded offset {importJob.graded_offset}</div>
            </div>
            {importJob.last_run_at ? (
              <div className="text-xs text-faint">Last run {formatTimestamp(importJob.last_run_at)}</div>
            ) : null}
            {importJob.last_error ? (
              <div className="text-xs text-red-400 break-all">{importJob.last_error}</div>
            ) : null}
            {stats.totalAssets > 0 &&
            importJob.status !== 'paused' &&
            importJob.status !== 'completed' &&
            importJob.sealed_imported === 0 &&
            importJob.set_index === 0 ? (
              <p className="text-xs text-yellow-400">
                Catalog already has {stats.totalAssets.toLocaleString()} active assets. Pause import
                before cron/admin starts a fresh PokemonPriceTracker ingest from sealed offset 0.
              </p>
            ) : null}
            <p className="text-xs text-faint">
              Full catalog is chunked: one Vercel run is ~4 minutes. Daily cron continues automatically after PPT
              regenerates at 06:00 UTC.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Apply the market_job_state migration to track resumable catalog import.
          </p>
        )}

        <div className="space-y-3">
          <div className="kicker mb-2">Market data</div>
          {actions.map((action) => (
            <div
              key={action.id}
              className="panel p-4 flex flex-col md:flex-row md:items-center gap-3"
            >
              <div className="flex-1">
                <div className="text-sm font-bold text-foreground">{action.label}</div>
                <div className="text-xs text-faint mt-0.5">{action.description}</div>
              </div>

              <button
                onClick={() => runAction(action.id)}
                disabled={loading[action.id]}
                className="btn btn-ghost"
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
          <div className="kicker">Create tournament</div>
          <div className="panel p-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="field"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="field"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-muted">
                BUDGET
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="text-xs text-muted">
                DAYS
                <input
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="field mt-1"
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
              className="btn btn-primary"
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
          <div className="kicker">Settle one</div>
          <div className="flex flex-col md:flex-row gap-2">
            <select
              value={settleId}
              onChange={(e) => setSettleId(e.target.value)}
              className="field flex-1"
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
              className="btn btn-ghost text-gold"
              style={{ border: '1px solid rgba(251,191,36,0.3)' }}
            >
              SETTLE
            </button>
          </div>
          {results['settle-tournament'] ? (
            <div className="text-xs font-mono break-all text-muted">
              {JSON.stringify(results['settle-tournament'])}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="kicker">Tournaments</div>
          {tournaments.length === 0 ? (
            <p className="text-sm text-muted">None yet. Apply the Phase 5–10 migration, then create one.</p>
          ) : (
            tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="flex items-center justify-between gap-3 panel px-4 py-3"
              >
                <span className="text-sm text-foreground truncate">{t.name}</span>
                <StatusBadge status={t.status} />
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
