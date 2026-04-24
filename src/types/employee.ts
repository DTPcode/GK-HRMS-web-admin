// ============================================================================
// GK-HRMS — Employee Types
// Dùng cho: EmployeeForm, EmployeeTable, EmployeeStore, EmployeeFilter
// Constraint: chỉ import từ zod
// Zod v4: dùng { error: "..." } thay { required_error: "..." }
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod Schema — employeeSchema
// ---------------------------------------------------------------------------

/**
 * Schema đầy đủ của entity nhân viên.
 * Map 1:1 với document /employees trong db.json.
 */
export const employeeSchema = z.object({
  id: z
    .string({ error: "ID nhân viên là bắt buộc" })
    .uuid("ID nhân viên phải là UUID hợp lệ"),

  name: z
    .string({ error: "Tên nhân viên là bắt buộc" })
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100, "Tên không được vượt quá 100 ký tự"),

  email: z
    .string({ error: "Email là bắt buộc" })
    .email("Email không hợp lệ, phải chứa ký tự @"),

  phone: z
    .string({ error: "Số điện thoại là bắt buộc" })
    .regex(
      /^0\d{9}$/,
      "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0"
    ),

  /**
   * @sensitive — Số CCCD/CMND. Phải mã hóa trước khi lưu vào database.
   * Không log, không hiển thị đầy đủ ngoài màn hình chi tiết (Admin only).
   */
  nationalId: z
    .string({ error: "Số CCCD là bắt buộc" })
    .regex(/^\d{12}$/, "Số CCCD phải gồm đúng 12 chữ số"),

  department: z.enum(
    ["Bếp", "Phục vụ", "Thu ngân", "Quản lý cửa hàng", "HR", "Kế toán"],
    { error: "Phòng ban là bắt buộc" }
  ),

  position: z
    .string({ error: "Chức danh là bắt buộc" })
    .min(2, "Chức danh phải có ít nhất 2 ký tự"),

  /** FK tới /branches — 1 trong 8 chi nhánh Gia Khánh */
  branchId: z
    .string({ error: "Chi nhánh là bắt buộc" })
    .min(1, "Chi nhánh là bắt buộc"),

  salary: z
    .number({ error: "Mức lương là bắt buộc" })
    .min(0, "Mức lương phải lớn hơn 0")
    .max(500_000_000, "Lương tối đa là 500.000.000 VND"),

  salaryType: z.enum(["monthly"], {
    error: "Loại lương là bắt buộc",
  }),

  /** Ngày bắt đầu làm việc — ISO date "YYYY-MM-DD" */
  startDate: z
    .string({ error: "Ngày bắt đầu là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  status: z.enum(["active", "inactive", "on_leave", "resigned"], {
    error: "Trạng thái là bắt buộc",
  }),

  /** URL ảnh đại diện — bỏ trống nếu chưa upload */
  avatarUrl: z.string().url("URL ảnh không hợp lệ").or(z.literal("")).optional(),

  /** ISO 8601 datetime — do server tự sinh */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),

  /** ISO 8601 datetime — tự cập nhật khi edit */
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Schema dùng cho EmployeeForm (tạo mới / chỉnh sửa).
 * Bỏ id, createdAt, updatedAt, salary, salaryType vì:
 *   - id, timestamps: server tự sinh
 *   - salary, salaryType: được quản lý qua Contract, không nhập trực tiếp từ form NV
 */
export const employeeFormSchema = employeeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  salary: true,
  salaryType: true,
});

// ---------------------------------------------------------------------------
// Derived Types
// ---------------------------------------------------------------------------

/** Entity nhân viên đầy đủ — dùng trong store, table, detail page */
export type Employee = z.infer<typeof employeeSchema>;

/** Payload gửi lên khi tạo / cập nhật nhân viên (không có id, timestamps) */
export type EmployeeFormData = z.infer<typeof employeeFormSchema>;

/** Union type trạng thái nhân viên */
export type EmployeeStatus = Employee["status"];

/** Union type loại lương */
export type SalaryType = Employee["salaryType"];

/** Union type phòng ban */
export type Department = Employee["department"];

// ---------------------------------------------------------------------------
// EmployeeFilter Interface
// Dùng trong: employeeStore.filter, EmployeeFilter component, URL search params
// ---------------------------------------------------------------------------

/**
 * Params lọc + phân trang danh sách nhân viên.
 * Tất cả fields đều optional (trừ page/pageSize) — undefined → không áp dụng filter đó.
 */
export interface EmployeeFilter {
  /** Tìm kiếm full-text theo tên / email / SĐT */
  search?: string;
  /** Lọc theo phòng ban (id hoặc name tùy API) */
  departmentId?: string;
  /** Lọc theo chi nhánh */
  branchId?: string;
  /** Lọc theo trạng thái nhân viên */
  status?: EmployeeStatus;
  /** Lọc theo loại lương */
  salaryType?: SalaryType;
  /** Cột sắp xếp */
  sortBy?: "name" | "salary" | "startDate" | "department";
  /** Chiều sắp xếp */
  sortOrder?: "asc" | "desc";
  /** Trang hiện tại (1-indexed) */
  page: number;
  /** Số bản ghi mỗi trang */
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Danh sách 8 chi nhánh nhà hàng Lẩu Nấm Gia Khánh.
 * Dùng trong: EmployeeForm (Select), EmployeeFilter, BranchDashboard.
 */
export const BRANCH_LIST = [
  { id: "branch-01", name: "Gia Khánh - Nguyễn Huệ",     address: "1 Nguyễn Huệ, Q.1, TP.HCM" },
  { id: "branch-02", name: "Gia Khánh - Lê Văn Sỹ",      address: "123 Lê Văn Sỹ, Q.3, TP.HCM" },
  { id: "branch-03", name: "Gia Khánh - Hai Bà Trưng",    address: "89 Hai Bà Trưng, Q.1, TP.HCM" },
  { id: "branch-04", name: "Gia Khánh - Phan Xích Long",  address: "56 Phan Xích Long, Q.Phú Nhuận, TP.HCM" },
  { id: "branch-05", name: "Gia Khánh - Nguyễn Trãi",     address: "200 Nguyễn Trãi, Q.5, TP.HCM" },
  { id: "branch-06", name: "Gia Khánh - Võ Văn Tần",      address: "78 Võ Văn Tần, Q.3, TP.HCM" },
  { id: "branch-07", name: "Gia Khánh - Cộng Hòa",        address: "45 Cộng Hòa, Q.Tân Bình, TP.HCM" },
  { id: "branch-08", name: "Gia Khánh - Bình Thạnh",      address: "12 Đinh Tiên Hoàng, Q.Bình Thạnh, TP.HCM" },
] as const;

/** Type một chi nhánh — dùng khi map / render Select option */
export type Branch = (typeof BRANCH_LIST)[number];

/**
 * Danh sách 6 phòng ban.
 * color: Tailwind bg class dùng cho badge phòng ban.
 */
export const DEPARTMENT_LIST = [
  { id: "dept-bep", name: "Bếp",              color: "bg-orange-100 text-orange-700" },
  { id: "dept-pv",  name: "Phục vụ",          color: "bg-sky-100 text-sky-700" },
  { id: "dept-tn",  name: "Thu ngân",          color: "bg-violet-100 text-violet-700" },
  { id: "dept-ql",  name: "Quản lý cửa hàng", color: "bg-amber-100 text-amber-700" },
  { id: "dept-hr",  name: "HR",               color: "bg-pink-100 text-pink-700" },
  { id: "dept-kt",  name: "Kế toán",          color: "bg-teal-100 text-teal-700" },
] as const;

/** Type một phòng ban — dùng khi render badge, filter option */
export type DepartmentItem = (typeof DEPARTMENT_LIST)[number];

/**
 * Cấu hình hiển thị theo trạng thái nhân viên.
 * Dùng trong: StatusBadge, EmployeeFilter Select, StatCard.
 */
export const STATUS_CONFIG: Record<
  EmployeeStatus,
  { label_vi: string; label_en: string; badgeColor: string }
> = {
  active:   { label_vi: "Đang làm việc", label_en: "Active",   badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  inactive: { label_vi: "Tạm nghỉ",      label_en: "Inactive", badgeColor: "bg-slate-100 text-slate-600 border-slate-200" },
  on_leave: { label_vi: "Nghỉ phép",     label_en: "On leave", badgeColor: "bg-amber-100 text-amber-700 border-amber-200" },
  resigned: { label_vi: "Đã nghỉ việc",  label_en: "Resigned", badgeColor: "bg-red-100 text-red-600 border-red-200" },
};

/**
 * Cấu hình hiển thị theo loại lương.
 * unit: đơn vị tính (tháng / giờ / ca) — dùng trong SalaryBreakdown.
 */
export const SALARY_TYPE_CONFIG: Record<
  SalaryType,
  { label_vi: string; unit: string }
> = {
  monthly: { label_vi: "Lương tháng", unit: "tháng" },
};
