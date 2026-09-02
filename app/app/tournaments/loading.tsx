import AppShell from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <AppShell nav="play">
      <main className="page page-main stack">
        <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
      </main>
    </AppShell>
  );
}
