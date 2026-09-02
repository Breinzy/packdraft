'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/brand/Logo';
import type { MarketEvent, Tournament } from '@/types';
import type { MarketJobState } from '@/lib/market/job-state';
import EventStatusBadge from '@/components/events/EventStatusBadge';
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
  events,
  importJob,
  sets,
}: {
  stats: AdminStats;
  tournaments: Tournament[];
  events: MarketEvent[];
  importJob: MarketJobState | null;
  sets: { id: string; name: string }[];
}) {
  const [results, setResults] = useState<Record<string, ActionResult | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [name, setName] = useState('Weekly Pokémon');
  const [description, setDescription] = useState('Highest virtual portfolio wins.');
  const [budget, setBudget] = useState('10000');
  const [days, setDays] = useState('7');
  const [settleId, setSettleId] = useState(tournaments[0]?.id ?? '');
  const [eventName, setEventName] = useState('Biggest mover');
  const [eventDescription, setEventDescription] = useState('Pick the asset with the largest % move.');
  const [eventType, setEventType] = useState('biggest_mover');
  const [eventLockHours, setEventLockHours] = useState('24');
  const [eventSettleHours, setEventSettleHours] = useState('24');
  const [eventAssetCount, setEventAssetCount] = useState('4');
  const [eventAssetIds, setEventAssetIds] = useState('');
  const [settleEventId, setSettleEventId] = useState(events[0]?.id ?? '');
  const [visibility, setVisibility] = useState('public');
  const [sponsorName, setSponsorName] = useState('');
  const [qualifierId, setQualifierId] = useState('');
  const [grantUserId, setGrantUserId] = useState('');
  const [grantDays, setGrantDays] = useState('30');
  const [releaseName, setReleaseName] = useState('Release weekend');
  const [releaseSetId, setReleaseSetId] = useState('');

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
    { id: 'sync-prices', label: 'Sync prices', description: 'Insert latest Packdraft snapshots for active assets' },
    {
      id: 'import-assets',
      label: 'Import catalog chunk',
      description: 'Resume full PPT ingest. Stops at ~4 minutes, PPT credits, or daily remaining.',
      warn: true,
    },
    { id: 'pause-import', label: 'Pause import', description: 'Stop cron/admin from continuing the catalog job' },
    { id: 'resume-import', label: 'Resume import', description: 'Allow the next chunk to run from the saved cursor' },
    { id: 'tick-tournaments', label: 'Tick tournaments', description: 'Advance lifecycle and settle locked books' },
    { id: 'tick-events', label: 'Tick events', description: 'Open, lock, and settle market events' },
  ];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="page flex min-h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" compact />
            <span className="pill bg-[rgba(201,178,122,0.12)] text-gold">Admin</span>
          </div>
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground min-h-11 inline-flex items-center">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="page page-main stack">
        <div className="card-grid grid-cols-2 md:grid-cols-3">
          {[
            { label: 'Active assets', value: stats.totalAssets },
            { label: 'Sealed', value: stats.sealedCount },
            { label: 'Singles', value: stats.singlesCount },
            { label: 'Graded', value: stats.gradedCount },
            { label: 'Snapshots', value: stats.snapshotCount },
            {
              label: 'Last sync',
              value: stats.lastSync ? formatTimestamp(stats.lastSync) : 'Never',
            },
            { label: 'Tournaments', value: tournaments.length },
            { label: 'Events', value: events.length },
          ].map((stat) => (
            <div key={stat.label} className="panel panel-row">
              <div className="kicker mb-1">{stat.label}</div>
              <div className="text-base font-bold text-foreground">{stat.value}</div>
            </div>
          ))}
        </div>

        {importJob ? (
          <div className="panel stack">
            <div className="section-title">Catalog import</div>
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

        <div className="stack">
          <div className="section-title">Market data</div>
          {actions.map((action) => (
            <div
              key={action.id}
              className="panel flex flex-col md:flex-row md:items-center gap-3"
            >
              <div className="flex-1">
                <div className="text-sm font-bold text-foreground">{action.label}</div>
                <div className="text-xs text-faint mt-0.5">{action.description}</div>
              </div>

              <button
                onClick={() => runAction(action.id)}
                disabled={loading[action.id]}
                className={`btn ${action.warn ? 'btn-ghost text-gold border-gold/40' : 'btn-primary'}`}
              >
                {loading[action.id] ? 'Running…' : 'Run'}
              </button>

              {results[action.id] && (
                <div
                  className={`w-full mt-1 text-xs rounded-md px-4 py-3 font-mono break-all border ${
                    results[action.id]?.error
                      ? 'bg-red/10 border-red/25 text-red'
                      : 'bg-green/10 border-green/25 text-green'
                  }`}
                >
                  {JSON.stringify(results[action.id], null, 2)}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="stack">
          <div className="section-title">Create tournament</div>
          <div className="panel stack">
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
            <div className="grid grid-cols-2 gap-4">
              <label className="kicker">
                Budget
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="kicker">
                Days
                <input
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="field mt-1"
                />
              </label>
            </div>
            <label className="kicker">
              Visibility
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="field mt-1">
                <option value="public">Public</option>
                <option value="private">Private (invite)</option>
              </select>
            </label>
            <label className="kicker">
              Sponsor label (optional)
              <input
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                className="field mt-1"
                placeholder="Does not promise prizes"
              />
            </label>
            <label className="kicker">
              Qualifier tournament (optional)
              <select value={qualifierId} onChange={(e) => setQualifierId(e.target.value)} className="field mt-1">
                <option value="">None — open to everyone</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() =>
                runAction('create-tournament', {
                  name,
                  description,
                  startingBudget: Number(budget),
                  durationDays: Number(days),
                  visibility,
                  sponsorName,
                  qualifierTournamentId: qualifierId || null,
                })
              }
              disabled={loading['create-tournament']}
              className="btn btn-primary"
            >
              {loading['create-tournament'] ? 'Creating…' : 'Create'}
            </button>
            {results['create-tournament'] ? (
              <div className="text-xs font-mono text-green break-all">
                {JSON.stringify(results['create-tournament'])}
              </div>
            ) : null}
          </div>
        </div>

        <div className="stack">
          <div className="section-title">Settle one</div>
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
              className="btn btn-ghost text-gold border-gold/40"
            >
              Settle
            </button>
          </div>
          {results['settle-tournament'] ? (
            <div className="text-xs font-mono break-all text-muted">
              {JSON.stringify(results['settle-tournament'])}
            </div>
          ) : null}
        </div>

        <div className="stack">
          <div className="section-title">Create market event</div>
          <div className="panel stack">
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Name"
              className="field"
            />
            <textarea
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Description"
              className="field"
            />
            <label className="kicker">
              Type
              <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="field mt-1">
                <option value="biggest_mover">Biggest mover</option>
                <option value="direction">Direction</option>
                <option value="ranking">Ranking</option>
                <option value="release_price">Release price</option>
              </select>
            </label>
            <div className="grid grid-cols-3 gap-4">
              <label className="kicker">
                Lock hours
                <input
                  value={eventLockHours}
                  onChange={(e) => setEventLockHours(e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="kicker">
                Settle hours
                <input
                  value={eventSettleHours}
                  onChange={(e) => setEventSettleHours(e.target.value)}
                  className="field mt-1"
                />
              </label>
              <label className="kicker">
                Asset count
                <input
                  value={eventAssetCount}
                  onChange={(e) => setEventAssetCount(e.target.value)}
                  className="field mt-1"
                />
              </label>
            </div>
            <label className="kicker">
              Asset IDs (optional, comma-separated)
              <input
                value={eventAssetIds}
                onChange={(e) => setEventAssetIds(e.target.value)}
                className="field mt-1"
                placeholder="Leave blank to auto-pick priced assets"
              />
            </label>
            <button
              type="button"
              onClick={() =>
                runAction('create-event', {
                  name: eventName,
                  description: eventDescription,
                  type: eventType,
                  lockHours: Number(eventLockHours),
                  settleHoursAfterLock: Number(eventSettleHours),
                  assetCount: Number(eventAssetCount),
                  assetIds: eventAssetIds,
                })
              }
              disabled={loading['create-event']}
              className="btn btn-primary"
            >
              {loading['create-event'] ? 'Creating…' : 'Create event'}
            </button>
            {results['create-event'] ? (
              <div className="text-xs font-mono text-green break-all">
                {JSON.stringify(results['create-event'])}
              </div>
            ) : null}
          </div>
        </div>

        <div className="stack">
          <div className="section-title">Settle one event</div>
          <div className="flex flex-col md:flex-row gap-2">
            <select
              value={settleEventId}
              onChange={(e) => setSettleEventId(e.target.value)}
              className="field flex-1"
            >
              <option value="">Select event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({event.status})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!settleEventId || loading['settle-event']}
              onClick={() => runAction('settle-event', { eventId: settleEventId })}
              className="btn btn-ghost text-gold border-gold/40"
            >
              Settle
            </button>
          </div>
          {results['settle-event'] ? (
            <div className="text-xs font-mono break-all text-muted">
              {JSON.stringify(results['settle-event'])}
            </div>
          ) : null}
        </div>

        <div className="stack">
          <div className="section-title">Grant Pro</div>
          <p className="text-xs text-muted">
            Flag only. No Stripe. Pro must not change tournament cash, prices, or ranks.
          </p>
          <div className="panel stack">
            <input
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              placeholder="User id"
              className="field"
            />
            <label className="kicker">
              Days
              <input value={grantDays} onChange={(e) => setGrantDays(e.target.value)} className="field mt-1" />
            </label>
            <button
              type="button"
              disabled={!grantUserId || loading['grant-pro']}
              onClick={() => runAction('grant-pro', { userId: grantUserId, days: Number(grantDays) })}
              className="btn btn-primary"
            >
              {loading['grant-pro'] ? 'Saving…' : 'Grant Pro'}
            </button>
            {results['grant-pro'] ? (
              <div className="text-xs font-mono text-green break-all">{JSON.stringify(results['grant-pro'])}</div>
            ) : null}
          </div>
        </div>

        <div className="stack">
          <div className="section-title">Create release weekend</div>
          <div className="panel stack">
            <input
              value={releaseName}
              onChange={(e) => setReleaseName(e.target.value)}
              placeholder="Name"
              className="field"
            />
            <label className="kicker">
              Set
              <select value={releaseSetId} onChange={(e) => setReleaseSetId(e.target.value)} className="field mt-1">
                <option value="">Select a set</option>
                {sets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!releaseSetId || loading['create-release']}
              onClick={() =>
                runAction('create-release', {
                  name: releaseName,
                  setId: releaseSetId,
                })
              }
              className="btn btn-primary"
            >
              {loading['create-release'] ? 'Creating…' : 'Create release weekend'}
            </button>
            {results['create-release'] ? (
              <div className="text-xs font-mono text-green break-all">
                {JSON.stringify(results['create-release'])}
              </div>
            ) : null}
          </div>
        </div>

        <div className="stack">
          <div className="section-title">Tournaments</div>
          {tournaments.length === 0 ? (
            <p className="text-sm text-muted">None yet. Apply the Phase 5–10 migration, then create one.</p>
          ) : (
            tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="flex items-center justify-between gap-3 panel panel-row"
              >
                <span className="text-sm text-foreground truncate">{t.name}</span>
                <StatusBadge status={t.status} />
              </Link>
            ))
          )}
        </div>

        <div className="stack">
          <div className="section-title">Events</div>
          {events.length === 0 ? (
            <p className="text-sm text-muted">None yet. Apply the Phase 14–15 migrations, then create one.</p>
          ) : (
            events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between gap-3 panel panel-row"
              >
                <span className="text-sm text-foreground truncate">{event.name}</span>
                <EventStatusBadge status={event.status} />
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
