'use client';

import { useState } from 'react';

export default function ShareLink({ path, label = 'Share' }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="btn btn-ghost min-h-11" onClick={copy}>
      {copied ? 'Copied link' : label}
    </button>
  );
}
