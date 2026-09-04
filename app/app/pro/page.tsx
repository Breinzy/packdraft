import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { COLLECTION_PATH } from '@/lib/product/paths';

export default function ProPage() {
  return (
    <AppShell>
      <main className="page py-6 md:py-8 space-y-6">
        <section className="panel-elevated p-5 md:p-6">
          <p className="label-caps">Packdraft Pro</p>
          <h1 className="page-title mt-2 text-2xl md:text-3xl">Intelligence on your actual book</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            Pro will analyze concentration, risk, and research context for holdings you track on
            Packdraft. It will not invent prices, change ranks, or paywall basic collection
            tracking.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Subscription billing and AI analysis are not live yet.
          </p>
          <Link href={COLLECTION_PATH} className="btn btn-primary mt-6 min-h-11">
            Back to portfolio
          </Link>
        </section>
      </main>
    </AppShell>
  );
}
