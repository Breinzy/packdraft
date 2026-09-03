'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HostTournamentForm({
  defaultPrivate = false,
}: {
  defaultPrivate?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('10000');
  const [days, setDays] = useState('7');
  const [visibility, setVisibility] = useState(defaultPrivate ? 'private' : 'public');
  const [sponsorName, setSponsorName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/tournaments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          startingBudget: Number(budget),
          durationDays: Number(days),
          visibility,
          sponsorName,
        }),
      });
      const data = (await res.json()) as { error?: string; id?: string; inviteCode?: string | null };
      if (!res.ok) {
        setError(data.error ?? 'Could not create');
        return;
      }
      if (data.id) {
        const invite = data.inviteCode ? `?invite=${data.inviteCode}` : '';
        router.push(`/tournaments/${data.id}${invite}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel stack">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="field" />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="field"
      />
      <div className="grid grid-cols-2 gap-4">
        <label className="kicker">
          Budget
          <input value={budget} onChange={(e) => setBudget(e.target.value)} className="field mt-1" />
        </label>
        <label className="kicker">
          Days
          <input value={days} onChange={(e) => setDays(e.target.value)} className="field mt-1" />
        </label>
      </div>
      <label className="kicker">
        Visibility
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="field mt-1">
          <option value="public">Public</option>
          <option value="private">Private (invite link)</option>
        </select>
      </label>
      <label className="kicker">
        Sponsor label (optional)
        <input
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
          className="field mt-1"
          placeholder="Does not promise prizes"
        />
      </label>
      <button type="submit" disabled={loading} className="btn btn-primary min-h-12 w-full md:w-auto">
        {loading ? 'Creating…' : 'Host tournament'}
      </button>
      {error ? <p className="text-sm text-red">{error}</p> : null}
    </form>
  );
}
