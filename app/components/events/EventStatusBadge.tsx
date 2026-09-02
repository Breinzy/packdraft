import { MARKET_EVENT_STATUS_LABELS, type MarketEventStatus } from '@/types';

const STYLES: Record<MarketEventStatus, string> = {
  upcoming: 'text-accent-light bg-accent-dim',
  open: 'pill-live',
  locked: 'text-gold bg-[rgba(201,178,122,0.12)]',
  settling: 'text-gold bg-[rgba(201,178,122,0.12)]',
  completed: 'text-muted bg-surface-3',
  cancelled: 'text-faint bg-surface-3',
};

export default function EventStatusBadge({ status }: { status: MarketEventStatus }) {
  const live = status === 'open';
  return (
    <span className={`pill ${STYLES[status]}`}>
      {live ? <span className="live-dot" /> : null}
      {MARKET_EVENT_STATUS_LABELS[status]}
    </span>
  );
}
