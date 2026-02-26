export default function LeaderboardLoading() {
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
      <main className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 max-w-5xl mx-auto w-full space-y-4 md:space-y-6">
        <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="px-4 md:px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="skeleton h-5 w-36 md:w-40" />
            <div className="skeleton h-5 w-14 md:w-16" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="px-4 md:px-5 py-3 border-b border-white/[0.03] flex items-center gap-3 md:gap-4"
            >
              <div className="skeleton h-5 w-8" />
              <div className="flex-1 skeleton h-5 w-24 md:w-32" />
              <div className="skeleton h-5 w-16 md:w-20" />
              <div className="hidden md:block skeleton h-5 w-16" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
