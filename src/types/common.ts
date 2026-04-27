// ============================================================================
// GK-HRMS — Common Types
// Các type dùng chung cho toàn bộ app
// ============================================================================

/** Metadata phân trang trả về từ API */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Wrapper chuẩn cho mọi API response */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  error?: string;
}

/** Option cho Select / Dropdown / FilterChip */
export interface SelectOption {
  value: string;
  label: string;
  /** Mã màu hiển thị (vd: badge phòng ban) */
  color?: string;
}

/** Item hoạt động gần đây — dùng ở Dashboard */
export interface ActivityItem {
  id: string;
  /** Hành động: "created" | "updated" | "deleted" | "approved" | "rejected" */
  action: string;
  /** Đối tượng bị tác động (vd: "Nguyễn Văn An") */
  target: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** ID user thực hiện */
  userId: string;
  /** Module liên quan */
  module: "employee" | "contract" | "attendance" | "payroll" | "account";
}

/** Trạng thái loading chung cho các store */
export type LoadingState = "idle" | "loading" | "success" | "error";

/** Các role trong hệ thống RBAC — source of truth: src/types/account.ts */
export type UserRole = "super_admin" | "hr_admin" | "branch_manager" | "accountant" | "director";

/** Loại lương */
export type SalaryType = "monthly";

/** Trạng thái nhân viên */
export type EmployeeStatus = "active" | "on_leave" | "resigned" | "terminated";

/** Trạng thái hợp đồng */
export type ContractStatus = "active" | "expired" | "terminated" | "pending";

/** Trạng thái chấm công */
export type AttendanceStatus = "present" | "absent" | "late" | "early_leave" | "on_leave";

/** Trạng thái bảng lương */
export type PayrollStatus = "draft" | "calculated" | "approved" | "paid" | "rejected";

/** Trạng thái đơn nghỉ phép */
export type LeaveStatus = "pending" | "approved" | "rejected";

/** Loại nghỉ phép */
export type LeaveType = "annual" | "sick" | "personal" | "maternity" | "unpaid";

/** Hình thức thanh toán lương */
export type PaymentMethod = "cash" | "bank_transfer";

// ---------------------------------------------------------------------------
// Notification System
// ---------------------------------------------------------------------------

export type NotificationType =
  // Điều chuyển
  | "transfer_requested"
  | "transfer_dispatched"
  | "transfer_source_accepted"
  | "transfer_source_rejected"
  | "transfer_executed"
  // Nghỉ việc
  | "resignation_submitted"
  | "resignation_approved"
  | "resignation_rejected"
  // Chấm công
  | "leave_requested"
  | "supplement_requested"
  | "leave_approved"
  | "attendance_ready"
  // Lương
  | "payroll_draft_created"
  | "payroll_pending_approval"
  | "payroll_approved"
  | "payroll_paid"
  // Hợp đồng
  | "contract_expiring_30"
  | "contract_expiring_7"
  // Khen thưởng / Kỷ luật
  | "reward_added"
  | "discipline_added";

export type NotificationRecipientType =
  | "hr_admin"
  | "branch_manager"
  | "accountant"
  | "director"
  | "specific_branch";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientType: NotificationRecipientType;
  recipientBranchId: string | null;
  relatedModule: string;
  relatedId: string;
  isRead: boolean;
  createdAt: string;
}

/** Icon + color config cho mỗi loại notification */
export const NOTIFICATION_TYPE_CONFIG: Record<
  string,
  { icon: string; color: string; bgColor: string }
> = {
  transfer_: { icon: "ArrowRightLeft", color: "text-blue-600", bgColor: "bg-blue-50" },
  resignation_: { icon: "UserMinus", color: "text-red-600", bgColor: "bg-red-50" },
  leave_: { icon: "Calendar", color: "text-amber-600", bgColor: "bg-amber-50" },
  supplement_: { icon: "Calendar", color: "text-amber-600", bgColor: "bg-amber-50" },
  attendance_: { icon: "Calendar", color: "text-amber-600", bgColor: "bg-amber-50" },
  payroll_: { icon: "DollarSign", color: "text-emerald-600", bgColor: "bg-emerald-50" },
  contract_: { icon: "FileText", color: "text-orange-600", bgColor: "bg-orange-50" },
  reward_: { icon: "Award", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  discipline_: { icon: "AlertTriangle", color: "text-red-600", bgColor: "bg-red-50" },
};

/** Helper: lấy style config từ notification type */
export function getNotificationStyle(type: NotificationType) {
  const prefix = type.replace(/[^_]+$/, "");
  return NOTIFICATION_TYPE_CONFIG[prefix] ?? {
    icon: "Bell",
    color: "text-slate-600",
    bgColor: "bg-slate-50",
  };
}

/** Route map cho navigation khi click notification */
export const NOTIFICATION_MODULE_ROUTES: Record<string, string> = {
  transfers: "/transfers",
  offboarding: "/offboarding",
  attendance: "/attendance",
  payroll: "/payroll",
  contracts: "/contracts",
  rewards: "/rewards",
};

