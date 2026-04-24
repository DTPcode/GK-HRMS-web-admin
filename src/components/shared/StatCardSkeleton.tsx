"use client";

// ============================================================================
// GK-HRMS — StatCardSkeleton
// Skeleton loading cho stat cards (4 cards row: Tổng NV, Lương, etc.)
// animate-pulse shimmer — giống layout thật của StatCard / SummaryCard
// ============================================================================

interface StatCardSkeletonProps {
  /** Số card — default 4 (Dashboard: 4 stat cards) */
  count?: number;
}

export function StatCardSkeleton({ count = 4 }: StatCardSkeletonProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`stat-sk-${i}`}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-7 w-16 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="mt-3 h-3 w-32 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
