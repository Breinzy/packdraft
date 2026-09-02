'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClaimCreatorForm() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/creators/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, bio }),
      });
      const data = (await res.json()) as { error?: string; slug?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not claim');
        return;
      }
      router.push(`/creators/${data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not claim');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel p-4 md:p-5 space-y-3">
      <label className="kicker">
        Creator slug
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="field mt-1" placeholder="pokestreamer" />
      </label>
      <label className="kicker">
        Bio
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="field mt-1" />
      </label>
      <button type="submit" disabled={loading} className="btn btn-primary min-h-12">
        {loading ? 'Saving…' : 'Open creator page'}
      </button>
      {error ? <p className="text-sm text-red">{error}</p> : null}
    </form>
  );
}
