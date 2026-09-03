"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AssetThumbProps {
  src: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "list";
  className?: string;
}

const SIZE = {
  sm: "size-10 rounded-lg",
  md: "size-14 rounded-xl",
  lg: "w-40 h-40 md:w-56 md:h-56 rounded-2xl",
  list: "h-[4.5rem] w-[4.5rem] rounded-[var(--radius-md)] md:h-20 md:w-20",
};

export default function AssetThumb({ src, alt, size = "list", className }: AssetThumbProps) {
  const [failed, setFailed] = useState(false);
  const box = cn(
    "relative flex shrink-0 items-center justify-center overflow-hidden border border-border-strong bg-card-elevated font-bold tracking-tight text-primary",
    SIZE[size],
    className,
  );

  if (!src || failed) {
    return (
      <div className={box} aria-hidden>
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
      className={cn(box, "object-cover")}
    />
  );
}
