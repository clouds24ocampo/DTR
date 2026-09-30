/** Dashboard-style loading skeleton grid. */
export default function SkeletonGrid({
  count = 6,
  columns = "sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  columns?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-6 ${columns}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-6"
        >
          <div className="mb-3 h-6 w-40 rounded-lg bg-slate-200" />
          <div className="mb-6 h-4 w-24 rounded-lg bg-slate-200" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded-lg bg-slate-100" />
            <div className="h-4 w-2/3 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
