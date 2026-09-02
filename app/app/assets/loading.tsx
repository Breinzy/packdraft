import AppShell from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <AppShell nav="market">
      <main className="page page-main stack">
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        <div className="card-grid md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
        </div>
      </main>
    </AppShell>
  );
}
