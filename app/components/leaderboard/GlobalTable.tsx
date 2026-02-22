'use client';

import { formatCurrency, formatPct } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types';

interface GlobalTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export default function GlobalTable({ entries, currentUserId }: GlobalTableProps) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-bold tracking-widest text-white">GLOBAL LEADERBOARD</h2>
        <p className="text-[10px] text-slate-600 tracking-wider mt-0.5">
          ALL LEAGUES · CURRENT CONTEST
        </p>
      </div>

      {/* Header row */}
      <div
        className="grid px-4 py-2 text-[9px] text-slate-600 tracking-widest border-b border-white/[0.04]"
        style={{ gridTemplateColumns: '40px 1fr 80px 100px 90px' }}
      >
        <span>RK</span>
        <span>PLAYER</span>
        <span>LEAGUE</span>
        <span className="text-right">VALUE</span>
        <span className="text-right">RETURN</span>
      </div>

      {entries.length === 0 ? (
        <div className="px-4 py-8 text-center text-[11px] text-slate-600 tracking-wider">
          NO DATA YET
        </div>
      ) : (
        entries.map((entry) => {
          const isYou = entry.profile.id === currentUserId;
          return (
            <div
              key={entry.profile.id}
              className="grid px-4 py-2.5 border-b border-white/[0.03] items-center"
              style={{
                gridTemplateColumns: '40px 1fr 80px 100px 90px',
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
              <span className="text-xs text-slate-200 truncate">
                {entry.profile.display_name || entry.profile.email.split('@')[0]}
                {isYou && (
                  <span className="text-purple-400 ml-1.5 text-[10px]">(YOU)</span>
                )}
              </span>
              <span className="text-[10px] text-accent-light tracking-wider">
                {/* Would be league name — simplified for now */}
                LEAGUE
              </span>
              <span className="text-right text-xs font-semibold text-white">
                {formatCurrency(entry.total_value)}
              </span>
              <span
                className="text-right text-xs font-semibold"
                style={{ color: entry.return_pct >= 0 ? '#34d399' : '#f87171' }}
              >
                {formatPct(entry.return_pct)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
