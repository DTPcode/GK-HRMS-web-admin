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
