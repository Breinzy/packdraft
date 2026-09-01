import type { Achievement } from '@/lib/player/history';

export default function AchievementList({ achievements }: { achievements: Achievement[] }) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {achievements.map((item) => (
        <li
          key={item.id}
          className={`px-4 py-3 text-sm rounded-[10px] border ${
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
