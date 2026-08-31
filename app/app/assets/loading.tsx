export default function Loading() {
  return (
    <div className="px-4 py-10 max-w-5xl mx-auto space-y-4">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton h-12 w-full" />
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-24 w-full" />
    </div>
  );
}
