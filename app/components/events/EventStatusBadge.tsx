import { MARKET_EVENT_STATUS_LABELS, type MarketEventStatus } from '@/types';

const STYLES: Record<MarketEventStatus, string> = {
  upcoming: 'text-accent-light border-accent/35',
  open: 'text-green border-green/40',
  locked: 'text-gold border-gold/40',
  settling: 'text-gold border-gold/40',
  completed: 'text-muted border-border-strong',
  cancelled: 'text-faint border-border',
};

export default function EventStatusBadge({ status }: { status: MarketEventStatus }) {
  return (
    <span className={`inline-flex items-center kicker border px-2 py-0.5 ${STYLES[status]}`}>
      {MARKET_EVENT_STATUS_LABELS[status]}
    </span>
  );
}
