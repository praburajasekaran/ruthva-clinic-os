export default function PatientDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Banner skeleton */}
      <div className="h-14 animate-pulse rounded-lg bg-gray-200" />

      {/* Quick actions skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-200" />
      </div>

      {/* Content skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-200 lg:col-span-2" />
      </div>
    </div>
  );
}
