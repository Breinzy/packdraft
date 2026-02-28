export default function ResultsLoading() {
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
      <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-10 max-w-5xl mx-auto w-full space-y-6">
        <div className="skeleton h-6 w-48" />
        <div className="rounded-2xl border border-white/[0.06] p-6 md:p-8 space-y-3">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-5 w-32" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-5 w-24" />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="px-5 py-2.5 flex items-center gap-3 border-b border-white/[0.03]">
                <div className="skeleton h-6 w-6 rounded" />
                <div className="flex-1 skeleton h-4 w-40" />
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        ))}
      </main>
    </>
  );
}
