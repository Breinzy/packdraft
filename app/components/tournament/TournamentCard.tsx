import Link from 'next/link';
import StatusBadge from '@/components/tournament/StatusBadge';
import TournamentLabels from '@/components/tournament/TournamentLabels';
import { Icon } from '@/components/icons';
import { formatCountdown, formatCurrency } from '@/lib/utils';
import { TOURNAMENT_STATUS_HELP } from '@/lib/tournament/lifecycle';
import type { Tournament } from '@/types';

export default function TournamentCard({
  tournament,
  href,
  cash,
  rank,
  portfolioValue,
}: {
  tournament: Tournament;
  href?: string;
  cash?: number;
  rank?: number | null;
  portfolioValue?: number;
  compact?: boolean;
}) {
  const live = tournament.status === 'active';
  const timeLabel =
    tournament.status === 'upcoming'
      ? `Starts ${formatCountdown(tournament.starts_at)}`
      : tournament.status === 'active'
        ? `${formatCountdown(tournament.trading_closes_at)} left`
        : tournament.status === 'completed'
          ? 'Settled'
          : TOURNAMENT_STATUS_HELP[tournament.status];

  const inner = (
    <div>
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-dim text-accent">
          <Icon name="trophy" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-base font-semibold text-foreground">{tournament.name}</h3>
            {live ? (
              <span className="pill pill-live shrink-0">
                <span className="live-dot" />
                Live
              </span>
            ) : (
              <StatusBadge status={tournament.status} />
            )}
          </div>
          <div className="mt-1.5">
            <TournamentLabels tournament={tournament} />
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="wallet" className="h-3.5 w-3.5" />
          Budget {formatCurrency(tournament.starting_budget)}
        </span>
        {portfolioValue != null ? (
          <span className="num">Value {formatCurrency(portfolioValue)}</span>
        ) : null}
        {cash != null ? <span className="num">Cash {formatCurrency(cash)}</span> : null}
        {rank != null ? <span>Rank #{rank}</span> : null}
        <span>{timeLabel}</span>
      </div>
    </div>
  );

  if (!href) {
    return <div className="panel">{inner}</div>;
  }
  return (
    <Link href={href} className="panel panel-hover block">
      {inner}
    </Link>
  );
}
