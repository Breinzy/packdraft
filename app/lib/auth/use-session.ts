'use client';

import { useEffect, useState } from 'react';
import { tryCreateBrowserClient } from '@/lib/supabase/client';
import { getOptionalPublicEnv } from '@/lib/env';
import { initialsFromName } from '@/lib/utils';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string;
  initials: string;
};

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const env = getOptionalPublicEnv();
  const [ready, setReady] = useState(!env.supabaseUrl || !env.supabasePublishableKey);

  useEffect(() => {
    const client = tryCreateBrowserClient();
    if (!client) {
      return;
    }

    async function load(db: NonNullable<typeof client>) {
      const {
        data: { user: authUser },
      } = await db.auth.getUser();
      setUser(authUser ?? null);
      if (authUser) {
        const { data } = await db.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
        if (data) setProfile(data as Profile);
      }
      setReady(true);
    }

    load(client);
  }, []);

  function displayName(): string {
    if (profile?.display_name) return profile.display_name;
    if (user?.user_metadata?.display_name) return user.user_metadata.display_name as string;
    if (user?.email) return user.email.split('@')[0];
    return 'You';
  }

  function initials(): string {
    return initialsFromName(displayName());
  }

  async function signOut() {
    const supabase = tryCreateBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = '/';
  }

  const sessionUser: SessionUser | null = user
    ? {
        id: user.id,
        email: user.email ?? null,
        displayName: displayName(),
        initials: initials(),
      }
    : null;

  return { user, profile, ready, isSignedIn: !!user, displayName, initials, signOut, sessionUser };
}
