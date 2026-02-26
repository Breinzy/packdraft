export default function DraftLoading() {
  return (
    <>
      <div className="border-b border-border py-3 px-4 md:py-4 md:px-16 flex items-center justify-between bg-background/90">
        <div className="skeleton h-8 md:h-9 w-40 md:w-48" />
        <div className="hidden md:flex gap-6 items-center">
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-10 w-32" />
        </div>
        <div className="md:hidden skeleton h-8 w-8" />
      </div>
      <div className="bg-accent/[0.06] border-b border-accent/[0.12] px-4 md:px-16 py-2 md:py-2.5 flex gap-4 md:gap-10">
        <div className="skeleton h-4 w-28 md:w-32" />
        <div className="skeleton h-4 w-20 md:w-24" />
        <div className="skeleton h-4 w-24 md:w-28" />
      </div>

      {/* Mobile: single column */}
      <div className="md:hidden flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-3 bg-white/[0.02] rounded-lg border border-white/[0.04]"
          >
            <div className="skeleton h-7 w-7 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-28" />
            </div>
            <div className="skeleton h-9 w-9 rounded" />
          </div>
        ))}
      </div>

      {/* Desktop: side by side */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          <div className="flex gap-3 mb-4">
            <div className="skeleton h-9 w-20" />
            <div className="skeleton h-9 w-24" />
            <div className="skeleton h-9 w-20" />
            <div className="flex-1" />
            <div className="skeleton h-9 w-48" />
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 bg-white/[0.02] rounded-lg border border-white/[0.04]"
            >
              <div className="skeleton h-4 w-6" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-4 w-48" />
                <div className="skeleton h-3 w-32" />
              </div>
              <div className="skeleton h-5 w-16" />
              <div className="skeleton h-5 w-14" />
              <div className="skeleton h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="w-80 border-l border-border p-4 space-y-4">
          <div className="skeleton h-4 w-24 mb-2" />
          <div className="skeleton h-6 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-2">
            <div className="skeleton h-14 w-full" />
            <div className="skeleton h-14 w-full" />
            <div className="skeleton h-14 w-full" />
          </div>
          <div className="space-y-2 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
