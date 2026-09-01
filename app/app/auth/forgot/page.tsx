'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import AuthShell from '@/components/layout/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`If an account exists for ${email}, we sent a reset link.`}>
        <Link href="/auth/login" className="text-sm text-accent-light hover:text-foreground">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password" subtitle="We’ll email you a reset link.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="kicker mb-2 block">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@email.com"
            className="field"
          />
        </label>
        {error ? (
          <div className="text-sm text-red border border-red/25 bg-red/10 rounded-md px-4 py-3">{error}</div>
        ) : null}
        <button type="submit" disabled={loading} className="btn btn-primary w-full min-h-12">
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="text-sm text-muted mt-6">
        <Link href="/auth/login" className="text-accent-light hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
