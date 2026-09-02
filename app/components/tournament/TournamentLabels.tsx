import type { Tournament } from '@/types';

export default function TournamentLabels({ tournament }: { tournament: Tournament }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="kicker border border-border rounded px-1.5 py-0.5">Free</span>
      {tournament.visibility === 'private' ? (
        <span className="kicker border border-border rounded px-1.5 py-0.5">Private</span>
      ) : null}
      {tournament.host_kind === 'creator' ? (
        <span className="kicker border border-border rounded px-1.5 py-0.5">Creator</span>
      ) : null}
      {tournament.qualifier_tournament_id ? (
        <span className="kicker border border-border rounded px-1.5 py-0.5">Qualifier</span>
      ) : null}
      {tournament.sponsor_name ? (
        <span className="kicker border border-gold/40 text-gold rounded px-1.5 py-0.5">
          {tournament.sponsor_name}
        </span>
      ) : null}
    </div>
  );
}
