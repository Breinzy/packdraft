import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export default function Badge({ children, color = '#9fc0e6', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs tracking-wider font-semibold px-2.5 py-1 rounded border',
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
