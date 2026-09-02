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
    <div className="panel flex min-h-[7.5rem] flex-col justify-between p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="label-caps">{label}</p>
        {icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-muted">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div>
        <p className="metric mt-3 text-[1.55rem]">{value}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {deltaPct != null ? <Delta pct={deltaPct} /> : null}
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
