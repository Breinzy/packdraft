'use client';

import { useState } from 'react';

interface AssetThumbProps {
  src: string | null;
  alt: string;
  size?: 'sm' | 'lg';
}

export default function AssetThumb({ src, alt, size = 'sm' }: AssetThumbProps) {
  const [failed, setFailed] = useState(false);
  const box = size === 'lg' ? 'w-40 h-40 md:w-56 md:h-56' : 'w-16 h-16 md:w-20 md:h-20';

  if (!src || failed) {
    return (
      <div
        className={`${box} shrink-0 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-2xl`}
        aria-hidden
      >
        ⚡
      </div>
    );
  }

  return (
    // External catalog images; hosts vary by provider payload.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`${box} shrink-0 rounded-xl object-cover bg-white/[0.04] border border-white/[0.06]`}
    />
  );
}
