export default function DashboardLoading() {
  return (
    <>
      <div className="bg-background/90">
        <div className="page flex items-center justify-between py-3 md:py-4 border-b border-border">
          <div className="skeleton h-8 md:h-9 w-40 md:w-48" />
          <div className="hidden md:flex gap-6 items-center">
            <div className="skeleton h-8 w-24" />
            <div className="skeleton h-8 w-24" />
            <div className="skeleton h-10 w-32" />
          </div>
          <div className="md:hidden skeleton h-8 w-8" />
        </div>
      </div>
      <main className="page py-8 md:py-12 space-y-6 md:space-y-8">
        <div className="panel px-5 py-6 md:px-8 md:py-8">
          <div className="skeleton h-6 md:h-8 w-56 md:w-72 mb-3" />
          <div className="skeleton h-4 w-40 md:w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="panel px-5 py-6 md:px-8 md:py-8">
            <div className="skeleton h-3 w-24 mb-4" />
            <div className="skeleton h-5 w-48 mb-3" />
            <div className="skeleton h-16 w-full" />
          </div>
          <div className="panel px-5 py-6 md:px-8 md:py-8">
            <div className="skeleton h-3 w-20 mb-4" />
            <div className="skeleton h-5 w-40 mb-3" />
            <div className="skeleton h-16 w-full" />
          </div>
        </div>
      </main>
    </>
  );
}
