import AppShell from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

export default function OverviewLoading() {
  return (
    <AppShell>
      <main className="page py-6 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <div className="panel-elevated p-6">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-4 h-10 w-56" />
              <Skeleton className="mt-6 h-44 w-full" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
              <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
              <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
            <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
