import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from '@/types';

const STYLES: Record<TournamentStatus, string> = {
  upcoming: 'text-accent-light border-accent/40',
  active: 'text-green border-green/40',
  locked: 'text-gold border-gold/40',
  settling: 'text-gold border-gold/40',
  completed: 'text-slate-400 border-white/20',
  archived: 'text-slate-500 border-white/10',
};

export default function StatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] md:text-xs tracking-widest border rounded px-2 py-0.5 ${STYLES[status]}`}
    >
      {TOURNAMENT_STATUS_LABELS[status].toUpperCase()}
    </span>
  );
}
