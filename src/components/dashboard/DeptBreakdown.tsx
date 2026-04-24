"use client";

// ============================================================================
// GK-HRMS — DeptBreakdown
// Biểu đồ phân bổ nhân viên theo phòng ban
// ============================================================================

import { useEmployeeStore } from "@/store/employeeStore";

export function DeptBreakdown() {
  const getCountByDepartment = useEmployeeStore((s) => s.getCountByDepartment);
  const deptCounts = getCountByDepartment();

  // TODO: Implement chart (có thể dùng div bars hoặc thêm chart library)
  // Hiện tại hiển thị dạng bar chart đơn giản bằng CSS

  const entries = Object.entries(deptCounts);
  const maxCount = Math.max(...entries.map(([, count]) => count), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">
        Nhân viên theo phòng ban
      </h3>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Chưa có dữ liệu
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map(([dept, count]) => (
            <div key={dept}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">{dept}</span>
                <span className="font-medium text-slate-800">{count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
