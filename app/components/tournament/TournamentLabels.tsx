import type { Tournament } from '@/types';

export default function TournamentLabels({ tournament }: { tournament: Tournament }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="pill bg-surface-3 text-muted">Free</span>
      {tournament.visibility === 'private' ? (
        <span className="pill bg-surface-3 text-muted">Private</span>
      ) : null}
      {tournament.host_kind === 'creator' ? (
        <span className="pill bg-surface-3 text-muted">Creator</span>
      ) : null}
      {tournament.qualifier_tournament_id ? (
        <span className="pill bg-surface-3 text-muted">Qualifier</span>
      ) : null}
      {tournament.sponsor_name ? (
        <span className="pill bg-[rgba(201,178,122,0.12)] text-gold">{tournament.sponsor_name}</span>
      ) : null}
    </div>
  );
}
