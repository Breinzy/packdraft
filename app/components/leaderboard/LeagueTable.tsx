'use client';

import { formatCurrency, formatPct } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types';

interface LeagueTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  leagueName: string;
  allLocked: boolean;
}

export default function LeagueTable({
  entries,
  currentUserId,
  leagueName,
  allLocked,
}: LeagueTableProps) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-widest text-white">{leagueName}</h2>
          <p className="text-[10px] text-slate-600 tracking-wider mt-0.5">
            {allLocked ? 'ALL PLAYERS LOCKED' : 'DRAFTING IN PROGRESS'}
          </p>
        </div>
        <span
          className="text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded border"
          style={{
            color: allLocked ? '#34d399' : '#fbbf24',
            borderColor: allLocked ? '#34d39944' : '#fbbf2444',
            background: allLocked ? '#34d39915' : '#fbbf2415',
          }}
        >
          {allLocked ? 'LIVE' : 'DRAFT'}
        </span>
      </div>

      {/* Header row */}
      <div className="grid px-4 py-2 text-[9px] text-slate-600 tracking-widest border-b border-white/[0.04]"
        style={{ gridTemplateColumns: '40px 1fr 100px 90px 80px' }}>
        <span>RK</span>
        <span>PLAYER</span>
        <span className="text-right">VALUE</span>
        <span className="text-right">RETURN</span>
        <span className="text-right">STATUS</span>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="px-4 py-8 text-center text-[11px] text-slate-600 tracking-wider">
          NO PLAYERS YET
        </div>
      ) : (
        entries.map((entry) => {
          const isYou = entry.profile.id === currentUserId;
          return (
            <div
              key={entry.profile.id}
              className="grid px-4 py-2.5 border-b border-white/[0.03] items-center"
              style={{
                gridTemplateColumns: '40px 1fr 100px 90px 80px',
                background: isYou ? 'rgba(124,58,237,0.06)' : undefined,
              }}
            >
              <span
                className="text-xs font-bold"
                style={{
                  color:
                    entry.rank === 1
                      ? '#fbbf24'
                      : entry.rank === 2
                      ? '#94a3b8'
                      : entry.rank === 3
                      ? '#d97706'
                      : '#475569',
                }}
              >
                #{entry.rank}
              </span>
              <div className="min-w-0">
                <span className="text-xs text-slate-200 truncate block">
                  {entry.profile.display_name || entry.profile.email.split('@')[0]}
                  {isYou && (
                    <span className="text-purple-400 ml-1.5 text-[10px]">(YOU)</span>
                  )}
                </span>
              </div>
              <span className="text-right text-xs font-semibold text-white">
                {formatCurrency(entry.total_value)}
              </span>
              <span
                className="text-right text-xs font-semibold"
                style={{ color: entry.return_pct >= 0 ? '#34d399' : '#f87171' }}
              >
                {formatPct(entry.return_pct)}
              </span>
              <span className="text-right">
                <span
                  className="text-[10px] tracking-wider"
                  style={{
                    color: entry.portfolio.is_locked ? '#34d399' : '#fbbf24',
                  }}
                >
                  {entry.portfolio.is_locked ? 'LOCKED' : 'DRAFTING'}
                </span>
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
