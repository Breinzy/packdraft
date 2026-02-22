import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'font-mono tracking-wider font-bold transition-all',
        size === 'sm' && 'text-[10px] px-2.5 py-1.5 rounded',
        size === 'md' && 'text-xs px-4 py-3 rounded-md',
        variant === 'primary' &&
          'bg-gradient-to-r from-purple-600 to-purple-700 border border-purple-500/50 text-white hover:from-purple-500 hover:to-purple-600 shadow-[0_0_24px_rgba(124,58,237,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        variant === 'ghost' &&
          'bg-transparent border border-white/[0.06] text-slate-500 hover:text-white hover:border-white/20',
        variant === 'danger' &&
          'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
