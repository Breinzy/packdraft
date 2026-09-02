import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from '@/types';

const STYLES: Record<TournamentStatus, string> = {
  upcoming: 'text-accent-light bg-accent-dim',
  active: 'pill-live',
  locked: 'text-gold bg-[rgba(201,178,122,0.12)]',
  settling: 'text-gold bg-[rgba(201,178,122,0.12)]',
  completed: 'text-muted bg-surface-3',
  archived: 'text-faint bg-surface-3',
};

export default function StatusBadge({ status }: { status: TournamentStatus }) {
  const live = status === 'active';
  return (
    <span className={`pill ${STYLES[status]}`}>
      {live ? <span className="live-dot" /> : null}
      {TOURNAMENT_STATUS_LABELS[status]}
    </span>
  );
}
