import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ClaimCreatorForm from '@/components/creators/ClaimCreatorForm';
import HostTournamentForm from '@/components/creators/HostTournamentForm';
import { tryCreateServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/admin';
import NeedsDatabase from '@/components/ui/NeedsDatabase';

export const dynamic = 'force-dynamic';

export default async function CreatePage() {
  const supabase = await tryCreateServerClient();
  if (!supabase) {
    return (
      <AppShell nav="play">
        <main className="page page-main stack">
          <h1 className="page-title text-2xl">Host</h1>
          <NeedsDatabase feature="Creator hosting" />
        </main>
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/create');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_creator')
    .eq('id', user.id)
    .maybeSingle();

  const canHost = Boolean(profile?.is_creator) || isAdminEmail(user.email);

  return (
    <AppShell nav="play">
      <main className="page page-main stack">
        <div>
          <p className="text-sm text-muted">
            Creator tournaments use the same isolated virtual books. No real money. No pay-to-win.
          </p>
        </div>
        {canHost ? <HostTournamentForm /> : <ClaimCreatorForm />}
      </main>
    </AppShell>
  );
}
