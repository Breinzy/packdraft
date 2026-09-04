'use client'

import { CheckCircle2, X } from 'lucide-react'
import { useUI } from '@/lib/ui'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts, dismissToast } = useUI()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border-strong bg-popover p-3.5 shadow-2xl"
        >
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              t.variant === 'positive' ? 'bg-positive-muted text-positive' : 'bg-primary-muted text-primary',
            )}
          >
            <CheckCircle2 className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{t.title}</p>
            {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
          </div>
          <button
            onClick={() => dismissToast(t.id)}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
