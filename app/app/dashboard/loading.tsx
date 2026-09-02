export default function DashboardLoading() {
  return (
    <>
      <div className="border-b border-border">
        <div className="page flex items-center justify-between min-h-14">
          <div className="skeleton h-7 w-36" />
          <div className="hidden md:flex gap-6 items-center">
            <div className="skeleton h-5 w-20" />
            <div className="skeleton h-5 w-20" />
            <div className="skeleton h-9 w-24" />
          </div>
          <div className="md:hidden skeleton h-8 w-8" />
        </div>
      </div>
      <main className="page py-6 md:py-8 space-y-8">
        <div>
          <div className="skeleton h-7 w-48 mb-2" />
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-32 mb-3" />
          <div className="panel px-4 py-3.5">
            <div className="skeleton h-5 w-56 mb-2" />
            <div className="skeleton h-3 w-24" />
          </div>
        </div>
      </main>
    </>
  );
}
