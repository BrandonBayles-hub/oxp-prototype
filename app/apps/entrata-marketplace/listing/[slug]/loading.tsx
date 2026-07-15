export default function ListingLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1 space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 animate-pulse rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-7 w-64 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-24 animate-pulse rounded-lg bg-muted"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <aside className="w-full shrink-0 lg:w-80">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </aside>
      </div>
    </div>
  );
}
