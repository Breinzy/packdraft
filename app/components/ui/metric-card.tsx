import { Icon, type IconName } from '@/components/icons';
import { Delta } from '@/components/ui/delta';

export function MetricCard({
  label,
  value,
  hint,
  icon,
  deltaPct,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: IconName;
  deltaPct?: number | null;
}) {
  return (
    <div className="panel flex min-h-[8.25rem] flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <p className="label-caps">{label}</p>
        {icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-muted">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-6">
        <p className="metric text-[1.55rem]">{value}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {deltaPct != null ? <Delta pct={deltaPct} /> : null}
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
