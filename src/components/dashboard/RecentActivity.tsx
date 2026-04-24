"use client";

// ============================================================================
// GK-HRMS — RecentActivity
// Feed hoạt động gần đây trong hệ thống
// ============================================================================

import type { ActivityItem } from "@/types/common";
import { formatDate } from "@/lib/utils";

// TODO: Fetch từ API hoặc computed từ các store
const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    action: "created",
    target: "Nguyễn Văn An",
    timestamp: "2024-04-20T09:30:00Z",
    userId: "acc-002",
    module: "employee",
  },
  {
    id: "act-2",
    action: "approved",
    target: "Đơn nghỉ phép - Trần Thị Bảo",
    timestamp: "2024-04-19T14:20:00Z",
    userId: "acc-001",
    module: "attendance",
  },
  {
    id: "act-3",
    action: "updated",
    target: "Hợp đồng HD-2024-001",
    timestamp: "2024-04-19T10:00:00Z",
    userId: "acc-002",
    module: "contract",
  },
];

const ACTION_LABELS: Record<string, string> = {
  created: "Tạo mới",
  updated: "Cập nhật",
  deleted: "Xóa",
  approved: "Phê duyệt",
  rejected: "Từ chối",
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-emerald-100 text-emerald-700",
  updated: "bg-blue-100 text-blue-700",
  deleted: "bg-red-100 text-red-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-orange-100 text-orange-700",
};

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">
        Hoạt động gần đây
      </h3>

      <div className="space-y-4">
        {MOCK_ACTIVITIES.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <span
              className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                ACTION_COLORS[activity.action] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {ACTION_LABELS[activity.action] ?? activity.action}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-700">
                {activity.target}
              </p>
              <p className="text-xs text-slate-400">
                {formatDate(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
