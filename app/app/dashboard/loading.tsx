import AppShell from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <AppShell nav="dashboard">
      <main className="page page-main">
        <div className="grid gap-[var(--grid-gap)] xl:grid-cols-[minmax(0,1fr)_22.5rem]">
          <div className="stack">
            <div className="panel-elevated">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-4 h-10 w-56" />
              <Skeleton className="mt-8 h-44 w-full" />
            </div>
            <div className="card-grid sm:grid-cols-3">
              <Skeleton className="h-32 w-full rounded-[var(--radius-lg)]" />
              <Skeleton className="h-32 w-full rounded-[var(--radius-lg)]" />
              <Skeleton className="h-32 w-full rounded-[var(--radius-lg)]" />
            </div>
          </div>
          <div className="stack">
            <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
            <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
