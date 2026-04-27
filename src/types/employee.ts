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
// BankAccount Schema
// ---------------------------------------------------------------------------

/**
 * Tài khoản ngân hàng của nhân viên.
 * 1 NV có thể có nhiều TK, nhưng chỉ 1 isPrimary = true (nhận lương).
 * Map 1:1 với document /bank-accounts trong db.json.
 */
export const bankAccountSchema = z.object({
  id: z
    .string({ error: "ID tài khoản là bắt buộc" })
    .min(1, "ID tài khoản là bắt buộc"),

  /** FK tới /employees */
  employeeId: z
    .string({ error: "ID nhân viên là bắt buộc" })
    .min(1, "ID nhân viên là bắt buộc"),

  /** Tên ngân hàng — VD: Vietcombank, BIDV, Techcombank */
  bankName: z
    .string({ error: "Vui lòng nhập tên ngân hàng" })
    .min(2, "Vui lòng nhập tên ngân hàng"),

  /** Số tài khoản — 9-19 chữ số */
  accountNumber: z
    .string({ error: "Số tài khoản là bắt buộc" })
    .regex(/^[0-9]{9,19}$/, "Số tài khoản 9-19 chữ số"),

  /** Tên chủ tài khoản — in hoa không dấu theo chuẩn ngân hàng */
  accountHolder: z
    .string({ error: "Vui lòng nhập tên chủ tài khoản" })
    .min(2, "Vui lòng nhập tên chủ tài khoản"),

  /** Chi nhánh ngân hàng — optional */
  branch: z.string().optional(),

  /** Tài khoản nhận lương chính — chỉ 1 TK isPrimary=true / NV */
  isPrimary: z.boolean().default(false),

  /** ISO 8601 datetime — do server tự sinh */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),

  /** ISO 8601 datetime — tự cập nhật khi edit */
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Schema dùng cho BankAccountForm (tạo mới / chỉnh sửa).
 * Bỏ id, timestamps vì server tự sinh.
 */
export const bankAccountFormSchema = bankAccountSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ---------------------------------------------------------------------------
// Derived Types — BankAccount
// ---------------------------------------------------------------------------

/** Entity tài khoản ngân hàng đầy đủ */
export type BankAccount = z.infer<typeof bankAccountSchema>;

/** Payload gửi lên khi tạo / cập nhật TK ngân hàng */
export type BankAccountFormData = z.infer<typeof bankAccountFormSchema>;

// ---------------------------------------------------------------------------
// Qualification Schema
// ---------------------------------------------------------------------------

/** Loại bằng cấp / chứng chỉ */
export const qualificationTypeEnum = z.enum([
  "degree",
  "certificate",
  "training",
  "other",
]);
export type QualificationType = z.infer<typeof qualificationTypeEnum>;

/**
 * Bằng cấp / Chứng chỉ / Đào tạo của nhân viên.
 * Map 1:1 với document /qualifications trong db.json.
 */
export const qualificationSchema = z.object({
  id: z
    .string({ error: "ID bằng cấp là bắt buộc" })
    .min(1, "ID bằng cấp là bắt buộc"),

  /** FK tới /employees */
  employeeId: z
    .string({ error: "ID nhân viên là bắt buộc" })
    .min(1, "ID nhân viên là bắt buộc"),

  /** Loại bằng cấp */
  type: qualificationTypeEnum,

  /** Tên bằng cấp / chứng chỉ */
  name: z
    .string({ error: "Vui lòng nhập tên bằng cấp" })
    .min(2, "Vui lòng nhập tên bằng cấp"),

  /** Nơi cấp — trường / tổ chức */
  issuedBy: z
    .string({ error: "Vui lòng nhập nơi cấp" })
    .min(2, "Vui lòng nhập nơi cấp"),

  /** Ngày cấp — ISO date "YYYY-MM-DD" */
  issuedDate: z
    .string({ error: "Vui lòng nhập ngày cấp" })
    .min(1, "Vui lòng nhập ngày cấp"),

  /** Ngày hết hạn — null nếu vĩnh viễn */
  expiryDate: z.string().nullable().optional(),

  /** URL file scan bằng cấp — optional */
  documentUrl: z.string().optional(),

  /** ISO 8601 datetime */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Schema dùng cho QualificationForm (tạo mới / chỉnh sửa).
 * Bỏ id, timestamps vì server tự sinh.
 */
export const qualificationFormSchema = qualificationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ---------------------------------------------------------------------------
// Derived Types — Qualification
// ---------------------------------------------------------------------------

/** Entity bằng cấp đầy đủ */
export type Qualification = z.infer<typeof qualificationSchema>;

/** Payload gửi lên khi tạo / cập nhật bằng cấp */
export type QualificationFormData = z.infer<typeof qualificationFormSchema>;

// ---------------------------------------------------------------------------
// Qualification Type Config
// ---------------------------------------------------------------------------

export const QUALIFICATION_TYPE_CONFIG: Record<
  QualificationType,
  { label_vi: string; icon: string; badgeColor: string }
> = {
  degree:      { label_vi: "Bằng cấp",       icon: "GraduationCap", badgeColor: "bg-blue-100 text-blue-700 border-blue-200" },
  certificate: { label_vi: "Chứng chỉ",      icon: "Award",         badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  training:    { label_vi: "Đào tạo nội bộ", icon: "BookOpen",      badgeColor: "bg-orange-100 text-orange-700 border-orange-200" },
  other:       { label_vi: "Khác",            icon: "FileText",      badgeColor: "bg-slate-100 text-slate-600 border-slate-200" },
};

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
  { id: "branch-01", name: "Gia Khánh - Nguyễn Huệ", address: "1 Nguyễn Huệ, Q.1, TP.HCM" },
  { id: "branch-02", name: "Gia Khánh - Lê Văn Sỹ", address: "123 Lê Văn Sỹ, Q.3, TP.HCM" },
  { id: "branch-03", name: "Gia Khánh - Hai Bà Trưng", address: "89 Hai Bà Trưng, Q.1, TP.HCM" },
  { id: "branch-04", name: "Gia Khánh - Phan Xích Long", address: "56 Phan Xích Long, Q.Phú Nhuận, TP.HCM" },
  { id: "branch-05", name: "Gia Khánh - Nguyễn Trãi", address: "200 Nguyễn Trãi, Q.5, TP.HCM" },
  { id: "branch-06", name: "Gia Khánh - Võ Văn Tần", address: "78 Võ Văn Tần, Q.3, TP.HCM" },
  { id: "branch-07", name: "Gia Khánh - Cộng Hòa", address: "45 Cộng Hòa, Q.Tân Bình, TP.HCM" },
  { id: "branch-08", name: "Gia Khánh - Bình Thạnh", address: "12 Đinh Tiên Hoàng, Q.Bình Thạnh, TP.HCM" },
] as const;

/** Type một chi nhánh — dùng khi map / render Select option */
export type Branch = (typeof BRANCH_LIST)[number];

/**
 * Danh sách 6 phòng ban.
 * color: Tailwind bg class dùng cho badge phòng ban.
 */
export const DEPARTMENT_LIST = [
  { id: "dept-bep", name: "Bếp", color: "bg-orange-100 text-orange-700" },
  { id: "dept-pv", name: "Phục vụ", color: "bg-sky-100 text-sky-700" },
  { id: "dept-tn", name: "Thu ngân", color: "bg-violet-100 text-violet-700" },
  { id: "dept-ql", name: "Quản lý cửa hàng", color: "bg-amber-100 text-amber-700" },
  { id: "dept-hr", name: "HR", color: "bg-pink-100 text-pink-700" },
  { id: "dept-kt", name: "Kế toán", color: "bg-teal-100 text-teal-700" },
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
  active: { label_vi: "Đang làm việc", label_en: "Active", badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  inactive: { label_vi: "Tạm nghỉ", label_en: "Inactive", badgeColor: "bg-slate-100 text-slate-600 border-slate-200" },
  on_leave: { label_vi: "Nghỉ phép", label_en: "On leave", badgeColor: "bg-amber-100 text-amber-700 border-amber-200" },
  resigned: { label_vi: "Đã nghỉ việc", label_en: "Resigned", badgeColor: "bg-red-100 text-red-600 border-red-200" },
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


// ---------------------------------------------------------------------------
// Transfer — Điều chuyển / Hỗ trợ tạm thời nhân sự (3-party workflow)
// ---------------------------------------------------------------------------
//
// LUỒNG NGHIỆP VỤ 3 BÊN:
//   1. BM chi nhánh cần → tạo đề xuất              → phase = 'requested'
//   2. HR điều phối → chọn chi nhánh nguồn          → phase = 'pending_source_approval'
//   3. BM chi nhánh nguồn → accept/reject
//      Accept → chọn NV                             → phase = 'approved'
//      Reject → lý do                               → phase = 'rejected_by_source'
//   4. HR xác nhận chính thức                        → phase = 'active'
//   5. Hoàn tất                                      → phase = 'completed'
// ---------------------------------------------------------------------------

/** Danh sách vị trí trong chuỗi nhà hàng — dùng cho Select dropdown */
export const POSITION_LIST = [
  "Bếp trưởng",
  "Đầu bếp chính",
  "Bếp phó",
  "Phụ bếp",
  "Nhân viên phục vụ",
  "Trưởng ca phục vụ",
  "Thu ngân",
  "Thu ngân trưởng",
  "Quản lý chi nhánh",
  "Chuyên viên nhân sự",
  "Trưởng phòng nhân sự",
  "Kế toán viên",
  "Kế toán trưởng",
  "Nhân viên",
] as const;

/** Loại đề xuất: vĩnh viễn hoặc tạm thời */
export const transferRequestTypeEnum = z.enum(["permanent", "temporary"]);
export type TransferRequestType = z.infer<typeof transferRequestTypeEnum>;

/** Hướng đề xuất: gửi đi hoặc nhận về */
export const transferDirectionEnum = z.enum(["send", "receive"]);
export type TransferDirection = z.infer<typeof transferDirectionEnum>;

/** 7 phases — 3-party workflow */
export const transferPhaseEnum = z.enum([
  "requested",
  "pending_source_approval",
  "approved",
  "rejected_by_source",
  "active",
  "completed",
]);
export type TransferPhase = z.infer<typeof transferPhaseEnum>;

/** Response từ chi nhánh nguồn */
export const sourceResponseEnum = z.enum(["pending", "accepted", "rejected"]);
export type SourceResponse = z.infer<typeof sourceResponseEnum>;

export const transferSchema = z.object({
  id: z.string().min(1),
  type: transferRequestTypeEnum,
  phase: transferPhaseEnum,

  // ── Đề xuất (BM điền) ──
  requestedBy: z.string().min(1),
  requestedByName: z.string().min(1),
  requestedByBranchId: z.string().min(1),
  direction: transferDirectionEnum,
  requiredPosition: z.string().min(1),
  requiredQuantity: z.number().min(1).default(1),
  requestedStartDate: z.string(),
  requestedEndDate: z.string().nullable(),
  reason: z.string().min(1),

  // ── HR điều phối ──
  sourceBranchId: z.string().nullable(),
  hrDispatchNote: z.string().nullable(),
  hrDispatchedBy: z.string().nullable(),
  hrDispatchedAt: z.string().nullable(),

  // ── Phản hồi chi nhánh nguồn ──
  sourceResponse: sourceResponseEnum.nullable(),
  sourceResponseBy: z.string().nullable(),
  sourceResponseAt: z.string().nullable(),
  sourceResponseNote: z.string().nullable(),

  // ── Thông tin chính thức (HR xác nhận) ──
  employeeId: z.string().nullable(),
  employeeName: z.string().nullable(),
  fromBranchId: z.string().nullable(),
  toBranchId: z.string().nullable(),
  newPosition: z.string().nullable(),
  decisionNumber: z.string().nullable(),
  effectiveDate: z.string().nullable(),
  endDate: z.string().nullable(),
  allowance: z.number().nullable(),
  executedBy: z.string().nullable(),
  executedAt: z.string().nullable(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Transfer = z.infer<typeof transferSchema>;

/** BM tạo đề xuất */
export const transferRequestSchema = z.object({
  requestType: transferRequestTypeEnum,
  direction: transferDirectionEnum,
  employeeId: z.string().nullable(),
  employeeName: z.string().nullable(),
  requiredPosition: z.string().min(1, "Vui lòng chọn vị trí"),
  requiredQuantity: z.number().min(1).default(1),
  reason: z.string().min(10, "Lý do tối thiểu 10 ký tự"),
  requestedStartDate: z.string().min(1, "Vui lòng nhập ngày"),
  requestedEndDate: z.string().nullable(),
});

export type TransferRequestData = z.infer<typeof transferRequestSchema>;

/** HR gửi phiếu đề nghị chi nhánh nguồn */
export interface TransferDispatchData {
  sourceBranchId: string;
  hrDispatchNote: string;
}

/** BM nguồn chấp nhận */
export interface SourceAcceptData {
  employeeId: string;
  employeeName: string;
  note?: string;
}

/** HR xác nhận chính thức */
export interface TransferExecutionData {
  fromBranchId: string;
  toBranchId: string;
  effectiveDate: string;
  newPosition?: string;
  decisionNumber?: string;
  endDate?: string;
  allowance?: number;
}

export const TRANSFER_REQUEST_TYPE_CONFIG: Record<
  TransferRequestType,
  { label_vi: string; icon: string; badgeColor: string }
> = {
  permanent: {
    label_vi: "Điều chuyển vĩnh viễn",
    icon: "ArrowRightLeft",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
  },
  temporary: {
    label_vi: "Hỗ trợ tạm thời",
    icon: "UserCheck",
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
  },
};

export const TRANSFER_DIRECTION_CONFIG: Record<
  TransferDirection,
  { label_vi: string; badgeColor: string }
> = {
  send: {
    label_vi: "Cho đi",
    badgeColor: "bg-rose-50 text-rose-600 border-rose-200",
  },
  receive: {
    label_vi: "Cần thêm người",
    badgeColor: "bg-teal-50 text-teal-600 border-teal-200",
  },
};

export const TRANSFER_PHASE_CONFIG: Record<
  TransferPhase,
  { label_vi: string; badgeColor: string; icon: string }
> = {
  requested: {
    label_vi: "Chờ HR điều phối",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    icon: "Clock",
  },
  pending_source_approval: {
    label_vi: "Chờ chi nhánh xác nhận",
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
    icon: "Send",
  },
  approved: {
    label_vi: "Đã xác nhận — Chờ HR",
    badgeColor: "bg-green-100 text-green-700 border-green-200",
    icon: "CheckCircle",
  },
  rejected_by_source: {
    label_vi: "Chi nhánh từ chối",
    badgeColor: "bg-red-100 text-red-600 border-red-200",
    icon: "XCircle",
  },
  active: {
    label_vi: "Đang thực hiện",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "Play",
  },
  completed: {
    label_vi: "Hoàn tất",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "Check",
  },
};

