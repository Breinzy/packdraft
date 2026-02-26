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
      <div className="px-4 md:px-5 py-3.5 border-b border-white/[0.06]">
        <h2 className="text-sm md:text-base font-bold tracking-widest text-white">GLOBAL LEADERBOARD</h2>
        <p className="text-[10px] md:text-xs text-slate-600 tracking-wider mt-0.5">
          ALL LEAGUES · CURRENT CONTEST
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          <div
            className="grid px-4 md:px-5 py-2.5 text-[10px] md:text-xs text-slate-600 tracking-widest border-b border-white/[0.04]"
            style={{ gridTemplateColumns: '36px 1fr 70px 90px 80px' }}
          >
            <span>RK</span>
            <span>PLAYER</span>
            <span>LEAGUE</span>
            <span className="text-right">VALUE</span>
            <span className="text-right">RETURN</span>
          </div>

          {entries.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-600 tracking-wider">
              NO DATA YET
            </div>
          ) : (
            entries.map((entry) => {
              const isYou = entry.profile.id === currentUserId;
              return (
                <div
                  key={entry.profile.id}
                  className="grid px-4 md:px-5 py-3 border-b border-white/[0.03] items-center"
                  style={{
                    gridTemplateColumns: '36px 1fr 70px 90px 80px',
                    background: isYou ? 'rgba(110,155,207,0.06)' : undefined,
                  }}
                >
                  <span
                    className="text-sm font-bold"
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
                  <span className="text-sm text-slate-200 truncate">
                    {entry.profile.display_name || entry.profile.email.split('@')[0]}
                    {isYou && (
                      <span className="ml-1.5 text-xs" style={{ color: '#9fc0e6' }}>(YOU)</span>
                    )}
                  </span>
                  <span className="text-xs text-accent-light tracking-wider">
                    LEAGUE
                  </span>
                  <span className="text-right text-sm font-semibold text-white">
                    {formatCurrency(entry.total_value)}
                  </span>
                  <span
                    className="text-right text-sm font-semibold"
                    style={{ color: entry.return_pct >= 0 ? '#34d399' : '#f87171' }}
                  >
                    {formatPct(entry.return_pct)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
