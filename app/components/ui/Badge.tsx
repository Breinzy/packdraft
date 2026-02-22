import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export default function Badge({ children, color = '#a78bfa', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded border',
        className
      )}
      style={{
        color,
        borderColor: `${color}44`,
        background: `${color}15`,
      }}
    >
      {children}
    </span>
  );
}
