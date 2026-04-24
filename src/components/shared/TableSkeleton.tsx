"use client";

// ============================================================================
// GK-HRMS — TableSkeleton
// Skeleton loading shimmer cho bảng dữ liệu
// animate-pulse + table structure giống thật → UX tốt hơn spinner
// ============================================================================

interface TableSkeletonProps {
  /** Số dòng skeleton — default 10 (SRS: page 20 items, skeleton ~10) */
  rows?: number;
  /** Số cột — default 6 */
  columns?: number;
  /** Hiển thị skeleton header — default true */
  showHeader?: boolean;
}

export function TableSkeleton({
  rows = 10,
  columns = 6,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-hidden">
        <table className="w-full">
          {/* ── Header ── */}
          {showHeader && (
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={`h-${i}`} className="px-4 py-3">
                    <div
                      className="h-3.5 animate-pulse rounded bg-slate-200"
                      style={{ width: `${50 + Math.random() * 40}%` }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          {/* ── Body ── */}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr
                key={`r-${rowIdx}`}
                className="border-b border-slate-100 last:border-none"
              >
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={`c-${rowIdx}-${colIdx}`} className="px-4 py-3">
                    {colIdx === 0 ? (
                      /* First col: avatar + text pattern */
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-200" />
                          <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
                        </div>
                      </div>
                    ) : colIdx === columns - 1 ? (
                      /* Last col: action dots */
                      <div className="flex justify-end gap-1">
                        <div className="h-7 w-7 animate-pulse rounded bg-slate-100" />
                        <div className="h-7 w-7 animate-pulse rounded bg-slate-100" />
                      </div>
                    ) : (
                      /* Normal col */
                      <div
                        className="h-3.5 animate-pulse rounded bg-slate-200"
                        style={{
                          width: `${40 + ((rowIdx * 17 + colIdx * 31) % 50)}%`,
                        }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
