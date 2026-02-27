export default function PatientsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
      <div className="flex items-center justify-between gap-4">
        <div className="h-11 w-full max-w-sm animate-pulse rounded-lg bg-gray-200" />
        <div className="h-11 w-32 animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex gap-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-gray-100 px-4 py-3">
            <div className="flex gap-8">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
