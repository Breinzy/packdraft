import AppShell from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function OverviewLoading() {
  return (
    <AppShell>
      <Skeleton className="mb-5 h-8 w-48" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-[420px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </AppShell>
  );
}
