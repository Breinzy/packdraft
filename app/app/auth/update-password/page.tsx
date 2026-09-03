'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/layout/AuthShell';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/overview');
  }

  return (
    <AuthShell title="New password" subtitle="Choose a password for your account.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="kicker mb-2 block">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
            className="field"
          />
        </label>
        {error ? (
          <div className="text-sm text-red border border-red/25 bg-red/10 rounded-md px-4 py-3">{error}</div>
        ) : null}
        <button type="submit" disabled={loading} className="btn btn-primary w-full min-h-12">
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
}
