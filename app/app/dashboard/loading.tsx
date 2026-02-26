export default function DashboardLoading() {
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
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
            <div className="skeleton h-6 md:h-8 w-56 md:w-72 mb-3" />
            <div className="skeleton h-4 w-40 md:w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
              <div className="skeleton h-3 w-16 mb-4" />
              <div className="skeleton h-5 md:h-6 w-40 mb-4" />
              <div className="skeleton h-7 md:h-8 w-32 mb-1" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
              <div className="skeleton h-3 w-16 mb-4" />
              <div className="skeleton h-5 md:h-6 w-40 mb-3" />
              <div className="flex gap-6">
                <div className="skeleton h-10 w-20" />
                <div className="skeleton h-10 w-20" />
              </div>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-6 md:px-8 md:py-8">
            <div className="skeleton h-3 w-20 mb-4" />
            <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6">
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
            </div>
            <div className="skeleton h-10 w-40" />
          </div>
        </div>
      </main>
    </>
  );
}
