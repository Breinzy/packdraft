import type { Achievement } from '@/lib/player/history';

export default function AchievementList({ achievements }: { achievements: Achievement[] }) {
  return (
    <ul className="card-grid grid-cols-1 md:grid-cols-2">
      {achievements.map((item) => (
        <li
          key={item.id}
          className={`px-5 py-4 text-sm rounded-[var(--radius-lg)] border ${
            item.earned
              ? 'border-accent/40 bg-accent-dim text-foreground'
              : 'border-border bg-surface text-faint'
          }`}
        >
          {item.earned ? '● ' : '○ '}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
