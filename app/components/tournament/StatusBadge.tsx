import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from '@/types';

const STYLES: Record<TournamentStatus, string> = {
  upcoming: 'text-accent-light border-accent/35',
  active: 'text-green border-green/40',
  locked: 'text-gold border-gold/40',
  settling: 'text-gold border-gold/40',
  completed: 'text-muted border-border-strong',
  archived: 'text-faint border-border',
};

export default function StatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <span className={`inline-flex items-center kicker border px-2 py-0.5 ${STYLES[status]}`}>
      {TOURNAMENT_STATUS_LABELS[status]}
    </span>
  );
}
