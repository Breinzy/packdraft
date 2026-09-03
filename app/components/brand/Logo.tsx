import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  compact = false,
}: {
  href?: string | null;
  compact?: boolean;
}) {
  const mark = (
    <span className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <span className="text-base font-black leading-none">P</span>
      </span>
      {!compact ? (
        <span className="text-[15px] font-bold tracking-tight text-foreground">Packdraft</span>
      ) : null}
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className={cn("inline-flex items-center text-foreground")}>
      {mark}
    </Link>
  );
}

export default Logo;
