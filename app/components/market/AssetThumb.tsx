'use client';

import { useState } from 'react';

interface AssetThumbProps {
  src: string | null;
  alt: string;
  size?: 'sm' | 'lg';
}

export default function AssetThumb({ src, alt, size = 'sm' }: AssetThumbProps) {
  const [failed, setFailed] = useState(false);
  const box =
    size === 'lg'
      ? 'w-40 h-40 md:w-56 md:h-56 rounded-[var(--radius-lg)]'
      : 'w-[4.5rem] h-[4.5rem] md:w-20 md:h-20 rounded-[var(--radius-md)]';

  if (!src || failed) {
    return (
      <div
        className={`${box} shrink-0 bg-surface-2 flex items-center justify-center text-faint font-semibold text-lg`}
        aria-hidden
      >
        P
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
      className={`${box} shrink-0 object-cover bg-surface-2`}
    />
  );
}
