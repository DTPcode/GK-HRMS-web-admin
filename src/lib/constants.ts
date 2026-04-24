// ============================================================================
// GK-HRMS — Constants
// Hằng số dùng chung toàn app
// Source of truth cho RBAC nằm tại src/types/account.ts (ROLE_PERMISSIONS)
// File này re-export + bổ sung label/color constants
// ============================================================================

import type { UserRole } from "@/types/account";
import { ROLE_PERMISSIONS as _ROLE_PERMISSIONS, ROLE_CONFIG } from "@/types/account";

/** Base URL của json-server mock API */
export const API_BASE = "http://localhost:3001";

/** Số bản ghi mặc định mỗi trang */
export const PAGE_SIZE_DEFAULT = 20;

/** Các option page size cho pagination */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/**
 * Navigation items cho Sidebar
 * icon: tên icon trong lucide-react (import động hoặc map thủ công)
 * visibleFor: null = hiện cho tất cả roles, mảng = chỉ hiện cho roles được liệt kê
 *
 * Tại sao dùng visibleFor thay vì ROLE_PERMISSIONS:
 *   Sidebar visibility khác với data access. VD: accountant có payroll (full)
 *   nhưng KHÔNG nên thấy menu "Nhân viên" trong sidebar.
 */
export const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: "LayoutDashboard", visibleFor: null },
  { href: "/employees",  label: "Nhân viên",  icon: "Users",           visibleFor: ["super_admin", "hr_admin"] },
  { href: "/contracts",  label: "Hợp đồng",   icon: "FileText",        visibleFor: ["super_admin", "hr_admin"] },
  { href: "/attendance", label: "Chấm công",  icon: "Clock",           visibleFor: ["super_admin", "hr_admin", "branch_manager"] },
  { href: "/payroll",    label: "Tính lương",  icon: "DollarSign",      visibleFor: ["super_admin", "hr_admin", "accountant"] },
  { href: "/accounts",   label: "Tài khoản",  icon: "Shield",          visibleFor: ["super_admin"] },
  { href: "/reports",    label: "Báo cáo",    icon: "BarChart2",       visibleFor: ["super_admin", "hr_admin", "accountant", "director"] },
] as const;

/** Label hiển thị cho từng EmployeeStatus */
export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: "Đang làm",
  inactive: "Tạm nghỉ",
  on_leave: "Nghỉ phép",
  resigned: "Đã nghỉ việc",
};

/** Màu badge cho từng EmployeeStatus */
export const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  on_leave: "bg-amber-100 text-amber-700",
  resigned: "bg-red-100 text-red-700",
};

/** Label hiển thị cho loại lương */
export const SALARY_TYPE_LABELS: Record<string, string> = {
  monthly: "Lương tháng",
};

/** Label hiển thị cho loại hợp đồng */
export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  probation: "Thử việc",
  "fixed-term": "Có thời hạn",
  indefinite: "Không thời hạn",
};

/** Label hiển thị cho trạng thái hợp đồng */
export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active: "Hiệu lực",
  expired: "Hết hạn",
  terminated: "Đã chấm dứt",
  pending: "Chờ ký",
};

/** Label hiển thị cho trạng thái chấm công */
export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: "Có mặt",
  absent: "Vắng",
  late: "Đi muộn",
  leave: "Nghỉ phép",
  holiday: "Ngày lễ",
};

/** Label hiển thị cho trạng thái bảng lương */
export const PAYROLL_STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  pending_approval: "Chờ duyệt",
  approved: "Đã duyệt",
  paid: "Đã chi",
};

/** Label hiển thị cho loại nghỉ phép */
export const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Phép năm",
  sick: "Ốm đau",
  maternity: "Thai sản",
  unpaid: "Không lương",
};

/**
 * Label hiển thị cho role — lấy từ ROLE_CONFIG trong account.ts
 * Key: UserRole enum value
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: ROLE_CONFIG.super_admin.label_vi,
  hr_admin: ROLE_CONFIG.hr_admin.label_vi,
  branch_manager: ROLE_CONFIG.branch_manager.label_vi,
  accountant: ROLE_CONFIG.accountant.label_vi,
  director: ROLE_CONFIG.director.label_vi,
};

/**
 * Re-export ROLE_PERMISSIONS từ account.ts
 * Nơi khác import từ đây hoặc trực tiếp từ @/types/account đều được.
 */
export const ROLE_PERMISSIONS = _ROLE_PERMISSIONS;
