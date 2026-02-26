import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
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
        size === 'sm' && 'text-xs px-3 py-2 rounded',
        size === 'md' && 'text-sm px-5 py-3 rounded-md',
        size === 'lg' && 'text-base px-10 py-4 rounded-lg',
        variant === 'primary' &&
          'border text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        variant === 'ghost' &&
          'bg-transparent border border-white/[0.06] text-slate-500 hover:text-white hover:border-white/20',
        variant === 'danger' &&
          'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20',
        className
      )}
      style={
        variant === 'primary'
          ? {
              background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
              borderColor: 'rgba(110,155,207,0.4)',
              boxShadow: '0 0 24px rgba(110,155,207,0.18)',
            }
          : undefined
      }
      {...props}
    >
      {children}
    </button>
  );
}
