import type { Achievement } from '@/lib/player/history';

export default function AchievementList({ achievements }: { achievements: Achievement[] }) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {achievements.map((item) => (
        <li
          key={item.id}
          className={`rounded-2xl border px-4 py-3 text-sm tracking-wider ${
            item.earned
              ? 'border-accent/40 bg-accent-dim text-white'
              : 'border-white/[0.06] bg-white/[0.02] text-slate-600'
          }`}
        >
          {item.earned ? '● ' : '○ '}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
