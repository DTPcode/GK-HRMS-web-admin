"use client";

// ============================================================================
// GK-HRMS — DashboardClient
// Trang tổng quan: stat cards + phòng ban breakdown + hoạt động gần đây
// Performance: skeleton loading cho stat cards khi fetch
// ============================================================================

import { useEffect, memo } from "react";
import {
  Users,
  UserCheck,
  Calendar,
  AlertCircle,
  UserPlus,
  DollarSign,
  UserMinus,
  FileText,
  Clock,
  Shield,
  Building2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployeeStore } from "@/store/employeeStore";
import { useContractStore } from "@/store/contractStore";
import { useAttendanceStore } from "@/store/attendanceStore";
import { DEPARTMENT_LIST } from "@/types/employee";

// ---------------------------------------------------------------------------
// Stat Card Skeleton
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: "blue" | "green" | "amber" | "red";
  trend?: { value: number; isUp: boolean };
}

const CARD_COLORS = {
  blue: {
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    trendUp: "text-blue-600",
  },
  green: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    trendUp: "text-emerald-600",
  },
  amber: {
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    trendUp: "text-amber-600",
  },
  red: {
    iconBg: "bg-red-100",
    iconText: "text-red-600",
    trendUp: "text-red-600",
  },
};

// React.memo: StatCard nhận props thuần (string, number, icon) — không cần
// re-render khi parent re-render vì loading/data thay đổi ở Dashboard.
const StatCard = memo(function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {
  const c = CARD_COLORS[color];

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div
          className={`rounded-lg p-2.5 transition-transform group-hover:scale-110 ${c.iconBg} ${c.iconText}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={`font-medium ${
              trend.isUp ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {trend.isUp ? "+" : "-"}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-slate-400">so với tháng trước</span>
        </div>
      )}
    </div>
  );
});
StatCard.displayName = "StatCard";

// ---------------------------------------------------------------------------
// Department Breakdown Table (Section 2 - Left)
// ---------------------------------------------------------------------------

function DeptBreakdownTable() {
  const getCountByDepartment = useEmployeeStore((s) => s.getCountByDepartment);
  const { employees } = useEmployeeStore();

  const deptCounts = getCountByDepartment();
  const total = employees.length || 1; // tránh chia 0

  // Map department name → DEPARTMENT_LIST color
  const deptColorMap: Map<string, string> = new Map(
    DEPARTMENT_LIST.map((d) => [d.name, d.color])
  );

  const entries = Object.entries(deptCounts).sort(
    ([, a], [, b]) => b - a // sort giảm dần theo số NV
  );
  const maxCount = Math.max(...entries.map(([, c]) => c), 1);

  // Colors cho progress bar mỗi dept
  const BAR_COLORS: Record<string, string> = {
    Bếp: "bg-orange-500",
    "Phục vụ": "bg-sky-500",
    "Thu ngân": "bg-violet-500",
    "Quản lý cửa hàng": "bg-amber-500",
    HR: "bg-pink-500",
    "Kế toán": "bg-teal-500",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          Nhân viên theo phòng ban
        </h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {employees.length} nhân viên
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Chưa có dữ liệu nhân viên
        </p>
      ) : (
        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-3">Phòng ban</th>
                <th className="w-16 pb-3 text-right">Số NV</th>
                <th className="w-16 pb-3 text-right">%</th>
                <th className="w-32 pb-3 pl-4">Phân bổ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map(([dept, count]) => {
                const pct = ((count / total) * 100).toFixed(1);
                const barColor = BAR_COLORS[dept] ?? "bg-blue-500";
                const badge = deptColorMap.get(dept) ?? "bg-slate-100 text-slate-700";

                return (
                  <tr key={dept} className="group transition-colors hover:bg-slate-50/50">
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badge}`}
                      >
                        {dept}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-sm font-semibold text-slate-700">
                      {count}
                    </td>
                    <td className="py-2.5 text-right text-sm text-slate-500">
                      {pct}%
                    </td>
                    <td className="py-2.5 pl-4">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Activity Timeline (Section 2 - Right)
// ---------------------------------------------------------------------------

interface ActivityItem {
  id: string;
  icon: React.ElementType;
  text: string;
  time: string;
  color: string;
}

// Mock data — sẽ thay bằng audit log thực tế sau
const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: "1",
    icon: UserPlus,
    text: "Nguyễn Văn An vừa được thêm vào phòng Bếp",
    time: "10 phút trước",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "2",
    icon: AlertCircle,
    text: "Hợp đồng NV Trần Thị Bảo sắp hết hạn (còn 5 ngày)",
    time: "30 phút trước",
    color: "bg-red-100 text-red-600",
  },
  {
    id: "3",
    icon: Calendar,
    text: "Lê Minh Tuấn nộp đơn nghỉ phép 3 ngày",
    time: "1 giờ trước",
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "4",
    icon: FileText,
    text: "Hợp đồng NV Phạm Hồng Ngọc đã được gia hạn",
    time: "2 giờ trước",
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "5",
    icon: DollarSign,
    text: "Bảng lương tháng 03/2026 đã được duyệt",
    time: "3 giờ trước",
    color: "bg-purple-100 text-purple-600",
  },
  {
    id: "6",
    icon: Shield,
    text: "Tài khoản chi nhánh Bình Thạnh vừa được tạo",
    time: "5 giờ trước",
    color: "bg-teal-100 text-teal-600",
  },
  {
    id: "7",
    icon: UserMinus,
    text: "Đỗ Thanh Hà đã nghỉ việc (trạng thái: resigned)",
    time: "1 ngày trước",
    color: "bg-slate-100 text-slate-600",
  },
];

function RecentActivityTimeline() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">
        Hoạt động gần đây
      </h3>

      <div className="relative space-y-0">
        {MOCK_ACTIVITIES.map((activity, idx) => {
          const Icon = activity.icon;
          const isLast = idx === MOCK_ACTIVITIES.length - 1;

          return (
            <div key={activity.id} className="relative flex gap-3 pb-4">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-4 top-8 h-full w-px bg-slate-200" />
              )}

              {/* Icon circle */}
              <div
                className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${activity.color}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm leading-snug text-slate-700">
                  {activity.text}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Dashboard Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div>
      {/* Stat cards skeleton */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Content skeleton */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="mb-4 h-6 w-48" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-2 flex-1 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="mb-4 h-6 w-40" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="mt-1 h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Client
// ---------------------------------------------------------------------------

export function DashboardClient() {
  const { employees, loading, fetchEmployees, stats } = useEmployeeStore();
  const {
    fetchContracts,
    expiringContracts,
    loading: contractsLoading,
  } = useContractStore();
  const { fetchLeaveRequests, getPendingLeaveCount } = useAttendanceStore();

  useEffect(() => {
    fetchEmployees();
    fetchContracts();
    fetchLeaveRequests();
  }, [fetchEmployees, fetchContracts, fetchLeaveRequests]);

  const isLoading = loading || contractsLoading;
  const s = stats();
  const expiringCount = expiringContracts().length;

  // ── Mock trends (hardcode — sẽ thay bằng tính toán so sánh tháng trước) ──
  const trends = {
    total: { value: 5.2, isUp: true },
    active: { value: 3.1, isUp: true },
    onLeave: { value: 12.5, isUp: false },
    expiring: { value: 8.3, isUp: true },
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-500">
              Tổng quan hệ thống quản lý nhân sự — Lẩu Nấm Gia Khánh
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* ═══ SECTION 1: Stat Cards ═══ */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Tổng nhân viên"
              value={s.total}
              icon={Users}
              color="blue"
              trend={trends.total}
            />
            <StatCard
              title="Đang làm việc"
              value={s.active}
              icon={UserCheck}
              color="green"
              trend={trends.active}
            />
            <StatCard
              title="Nghỉ phép hôm nay"
              value={s.onLeave}
              icon={Calendar}
              color="amber"
              trend={trends.onLeave}
            />
            <StatCard
              title="HĐ sắp hết hạn"
              value={expiringCount}
              icon={AlertCircle}
              color="red"
              trend={trends.expiring}
            />
          </div>

          {/* ═══ SECTION 2: Dept Breakdown + Recent Activity (60/40) ═══ */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <DeptBreakdownTable />
            </div>
            <div className="lg:col-span-2">
              <RecentActivityTimeline />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
