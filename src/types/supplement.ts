// ============================================================================
// GK-HRMS — Supplement Types (Bổ sung công, Audit Log, Data Lock)
// Dùng cho: AttendanceSupplementTable, AuditLogTable, DataLockPanel
// Constraint: chỉ import từ zod
// Zod v4: dùng { error: "..." } thay { required_error: "..." }
// ============================================================================

import { z } from "zod";

// ===========================================================================
// PHẦN 1: ATTENDANCE SUPPLEMENT (Duyệt công bổ sung)
// ===========================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Loại yêu cầu bổ sung công */
export const attendanceSupplementTypeEnum = z.enum(
  [
    "late_explanation",
    "early_leave",
    "missing_checkin",
    "missing_checkout",
    "overtime_request",
  ],
  { error: "Loại bổ sung công là bắt buộc" }
);

/** Trạng thái yêu cầu bổ sung — workflow: pending → approved/rejected */
export const supplementStatusEnum = z.enum(
  ["pending", "approved", "rejected"],
  { error: "Trạng thái yêu cầu là bắt buộc" }
);

// ---------------------------------------------------------------------------
// Zod Schema — attendanceSupplementSchema
// ---------------------------------------------------------------------------

/** Regex HH:mm — validate giờ checkin/checkout bổ sung */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Schema đầy đủ của Yêu cầu bổ sung công.
 * Map 1:1 với document /attendance-supplements trong db.json.
 */
export const attendanceSupplementSchema = z.object({
  id: z
    .string({ error: "ID yêu cầu là bắt buộc" })
    .uuid("ID yêu cầu phải là UUID hợp lệ"),

  employeeId: z
    .string({ error: "ID nhân viên là bắt buộc" })
    .min(1, "ID nhân viên là bắt buộc"),

  /** Ngày cần bổ sung công — ISO date "YYYY-MM-DD" */
  date: z
    .string({ error: "Ngày bổ sung là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  type: attendanceSupplementTypeEnum,

  /** Giờ checkin yêu cầu — "HH:mm", null nếu không áp dụng */
  requestedCheckIn: z
    .string()
    .regex(TIME_REGEX, "Giờ vào phải theo định dạng HH:mm")
    .nullable(),

  /** Giờ checkout yêu cầu — "HH:mm", null nếu không áp dụng */
  requestedCheckOut: z
    .string()
    .regex(TIME_REGEX, "Giờ ra phải theo định dạng HH:mm")
    .nullable(),

  reason: z
    .string({ error: "Lý do bổ sung là bắt buộc" })
    .min(10, "Lý do bổ sung phải có ít nhất 10 ký tự"),

  status: supplementStatusEnum,

  /** userId người phê duyệt — null nếu chưa duyệt */
  approvedBy: z.string().nullable(),

  /** ISO datetime phê duyệt — null nếu chưa duyệt */
  approvedAt: z
    .string()
    .datetime({ message: "approvedAt phải là ISO datetime" })
    .nullable(),

  /** Lý do từ chối — null nếu không bị reject */
  rejectionReason: z
    .string()
    .min(5, "Lý do từ chối phải có ít nhất 5 ký tự")
    .nullable(),

  /** ISO 8601 datetime — do server tự sinh */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),

  /** ISO 8601 datetime — tự cập nhật khi edit */
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Schema dùng cho SupplementForm (NV tạo yêu cầu).
 * Bỏ id, status, approvedBy, approvedAt, rejectionReason, timestamps
 * vì server/workflow quản lý.
 */
export const attendanceSupplementFormSchema = attendanceSupplementSchema.omit({
  id: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
});

// ---------------------------------------------------------------------------
// Derived Types — Attendance Supplement
// ---------------------------------------------------------------------------

/** Entity yêu cầu bổ sung công đầy đủ — dùng trong store, table */
export type AttendanceSupplement = z.infer<typeof attendanceSupplementSchema>;

/** Payload gửi lên khi tạo yêu cầu bổ sung công */
export type AttendanceSupplementFormData = z.infer<
  typeof attendanceSupplementFormSchema
>;

/** Union type loại bổ sung công */
export type AttendanceSupplementType = z.infer<
  typeof attendanceSupplementTypeEnum
>;

/** Union type trạng thái yêu cầu bổ sung */
export type SupplementStatus = z.infer<typeof supplementStatusEnum>;

// ---------------------------------------------------------------------------
// Constants — Supplement Config
// ---------------------------------------------------------------------------

/**
 * Cấu hình hiển thị theo loại bổ sung công.
 * Dùng trong: SupplementTypeBadge, SupplementTable, SupplementForm Select.
 */
export const SUPPLEMENT_TYPE_CONFIG: Record<
  AttendanceSupplementType,
  { label_vi: string; icon: string; badgeColor: string }
> = {
  late_explanation: {
    label_vi: "Giải trình đi trễ",
    icon: "Clock",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
  },
  early_leave: {
    label_vi: "Xin về sớm",
    icon: "LogOut",
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
  },
  missing_checkin: {
    label_vi: "Thiếu checkin",
    icon: "LogIn",
    badgeColor: "bg-red-100 text-red-600 border-red-200",
  },
  missing_checkout: {
    label_vi: "Thiếu checkout",
    icon: "DoorOpen",
    badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
  },
  overtime_request: {
    label_vi: "Yêu cầu tăng ca",
    icon: "Timer",
    badgeColor: "bg-sky-100 text-sky-700 border-sky-200",
  },
};

/**
 * Cấu hình hiển thị theo trạng thái yêu cầu.
 * Dùng chung cho Supplement + có thể reuse cho approval workflows khác.
 */
export const SUPPLEMENT_STATUS_CONFIG: Record<
  SupplementStatus,
  { label_vi: string; badgeColor: string }
> = {
  pending: {
    label_vi: "Chờ duyệt",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
  },
  approved: {
    label_vi: "Đã duyệt",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label_vi: "Từ chối",
    badgeColor: "bg-red-100 text-red-600 border-red-200",
  },
};

// ===========================================================================
// PHẦN 2: AUDIT LOG (Nhật ký hệ thống)
// ===========================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Hành động được ghi log */
export const auditActionEnum = z.enum(
  [
    "create",
    "update",
    "delete",
    "approve",
    "reject",
    "export",
    "login",
    "logout",
    "lock",
    "unlock",
  ],
  { error: "Hành động audit là bắt buộc" }
);

/** Module trong hệ thống */
export const auditModuleEnum = z.enum(
  [
    "employees",
    "contracts",
    "attendance",
    "payroll",
    "accounts",
    "reports",
    "insurance",
    "rewards",
    "offboarding",
  ],
  { error: "Module audit là bắt buộc" }
);

// ---------------------------------------------------------------------------
// Zod Schema — auditLogSchema
// ---------------------------------------------------------------------------

/**
 * Schema đầy đủ của bản ghi Audit Log.
 * Map 1:1 với document /audit-logs trong db.json.
 * Chỉ READ-ONLY — không có form tạo mới (hệ thống tự ghi).
 */
export const auditLogSchema = z.object({
  id: z
    .string({ error: "ID audit log là bắt buộc" })
    .uuid("ID audit log phải là UUID hợp lệ"),

  /** userId người thực hiện hành động */
  userId: z
    .string({ error: "ID người thực hiện là bắt buộc" })
    .min(1, "ID người thực hiện là bắt buộc"),

  /** Tên hiển thị — denormalized để tránh JOIN khi đọc log */
  userName: z
    .string({ error: "Tên người thực hiện là bắt buộc" })
    .min(1, "Tên người thực hiện là bắt buộc"),

  action: auditActionEnum,

  module: auditModuleEnum,

  /** ID đối tượng bị tác động (employeeId, contractId, ...) */
  targetId: z
    .string({ error: "ID đối tượng là bắt buộc" })
    .min(1, "ID đối tượng là bắt buộc"),

  /** Tên đối tượng — denormalized để dễ đọc (e.g. "Nguyễn Văn A") */
  targetName: z
    .string({ error: "Tên đối tượng là bắt buộc" })
    .min(1, "Tên đối tượng là bắt buộc"),

  /**
   * Chi tiết thay đổi — chỉ có khi action = "update".
   * Key = tên field, value = { before, after }.
   * null khi action không phải update.
   */
  changes: z
    .record(
      z.string(),
      z.object({
        before: z.unknown(),
        after: z.unknown(),
      })
    )
    .nullable(),

  /** Địa chỉ IP của request */
  ipAddress: z
    .string({ error: "Địa chỉ IP là bắt buộc" })
    .min(1, "Địa chỉ IP là bắt buộc"),

  /** ISO 8601 datetime — thời điểm ghi log */
  timestamp: z
    .string({ error: "Thời điểm là bắt buộc" })
    .datetime({ message: "timestamp phải là ISO datetime" }),
});

// ---------------------------------------------------------------------------
// Derived Types — Audit Log
// ---------------------------------------------------------------------------

/** Entity audit log đầy đủ — READ-ONLY, dùng trong AuditLogTable */
export type AuditLog = z.infer<typeof auditLogSchema>;

/** Union type hành động audit */
export type AuditAction = z.infer<typeof auditActionEnum>;

/** Union type module audit */
export type AuditModule = z.infer<typeof auditModuleEnum>;

// ---------------------------------------------------------------------------
// AuditLogFilter — Params lọc + phân trang
// ---------------------------------------------------------------------------

/**
 * Params lọc danh sách audit log.
 * Dùng trong: AuditLogStore filter, AuditLogFilter component.
 */
export interface AuditLogFilter {
  /** Lọc theo userId người thực hiện */
  userId?: string;
  /** Lọc theo module */
  module?: AuditModule;
  /** Lọc theo hành động */
  action?: AuditAction;
  /** Lọc từ ngày — ISO date "YYYY-MM-DD" */
  dateFrom?: string;
  /** Lọc đến ngày — ISO date "YYYY-MM-DD" */
  dateTo?: string;
  /** Trang hiện tại (1-indexed) */
  page: number;
  /** Số bản ghi mỗi trang */
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Constants — Audit Config
// ---------------------------------------------------------------------------

/**
 * Label tiếng Việt cho mỗi hành động audit.
 * Dùng trong: AuditLogTable, AuditLogFilter Select.
 */
export const AUDIT_ACTION_CONFIG: Record<
  AuditAction,
  { label_vi: string; icon: string; badgeColor: string }
> = {
  create: {
    label_vi: "Tạo mới",
    icon: "Plus",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  update: {
    label_vi: "Cập nhật",
    icon: "Pencil",
    badgeColor: "bg-sky-100 text-sky-700 border-sky-200",
  },
  delete: {
    label_vi: "Xóa",
    icon: "Trash2",
    badgeColor: "bg-red-100 text-red-600 border-red-200",
  },
  approve: {
    label_vi: "Phê duyệt",
    icon: "CheckCircle",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  reject: {
    label_vi: "Từ chối",
    icon: "XCircle",
    badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
  },
  export: {
    label_vi: "Xuất dữ liệu",
    icon: "Download",
    badgeColor: "bg-violet-100 text-violet-700 border-violet-200",
  },
  login: {
    label_vi: "Đăng nhập",
    icon: "LogIn",
    badgeColor: "bg-sky-100 text-sky-700 border-sky-200",
  },
  logout: {
    label_vi: "Đăng xuất",
    icon: "LogOut",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  lock: {
    label_vi: "Khóa",
    icon: "Lock",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
  },
  unlock: {
    label_vi: "Mở khóa",
    icon: "Unlock",
    badgeColor: "bg-teal-100 text-teal-700 border-teal-200",
  },
};

/**
 * Label tiếng Việt cho mỗi module.
 * Dùng trong: AuditLogTable, AuditLogFilter Select.
 */
export const AUDIT_MODULE_CONFIG: Record<
  AuditModule,
  { label_vi: string; icon: string }
> = {
  employees: { label_vi: "Nhân viên", icon: "Users" },
  contracts: { label_vi: "Hợp đồng", icon: "FileText" },
  attendance: { label_vi: "Chấm công", icon: "CalendarCheck" },
  payroll: { label_vi: "Bảng lương", icon: "Banknote" },
  accounts: { label_vi: "Tài khoản", icon: "UserCog" },
  reports: { label_vi: "Báo cáo", icon: "BarChart3" },
  insurance: { label_vi: "Bảo hiểm", icon: "ShieldCheck" },
  rewards: { label_vi: "Khen thưởng/Kỷ luật", icon: "Award" },
  offboarding: { label_vi: "Nghỉ việc", icon: "UserMinus" },
};

// ===========================================================================
// PHẦN 3: DATA LOCK (Khóa dữ liệu kỳ)
// ===========================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Loại khóa dữ liệu */
export const lockTypeEnum = z.enum(
  ["attendance_period", "payroll_period"],
  { error: "Loại khóa dữ liệu là bắt buộc" }
);

// ---------------------------------------------------------------------------
// Zod Schema — dataLockSchema
// ---------------------------------------------------------------------------

/**
 * Schema đầy đủ của bản ghi khóa kỳ.
 * Map 1:1 với document /data-locks trong db.json.
 * Dùng để ngăn chỉnh sửa chấm công/lương sau khi đã chốt kỳ.
 */
export const dataLockSchema = z.object({
  id: z
    .string({ error: "ID khóa kỳ là bắt buộc" })
    .uuid("ID khóa kỳ phải là UUID hợp lệ"),

  type: lockTypeEnum,

  /** Kỳ khóa — định dạng "YYYY-MM" */
  period: z
    .string({ error: "Kỳ khóa là bắt buộc" })
    .regex(/^\d{4}-\d{2}$/, "Kỳ phải theo định dạng YYYY-MM"),

  /** userId người khóa */
  lockedBy: z
    .string({ error: "Người khóa là bắt buộc" })
    .min(1, "Người khóa là bắt buộc"),

  /** ISO datetime thời điểm khóa */
  lockedAt: z
    .string({ error: "Thời điểm khóa là bắt buộc" })
    .datetime({ message: "lockedAt phải là ISO datetime" }),

  /** userId người mở khóa — null nếu chưa mở */
  unlockedBy: z.string().nullable(),

  /** ISO datetime thời điểm mở khóa — null nếu chưa mở */
  unlockedAt: z
    .string()
    .datetime({ message: "unlockedAt phải là ISO datetime" })
    .nullable(),

  /** true = đang khóa, false = đã mở khóa */
  isLocked: z.boolean({ error: "Trạng thái khóa là bắt buộc" }),

  note: z
    .string()
    .max(500, "Ghi chú không được vượt quá 500 ký tự")
    .optional(),
});

// ---------------------------------------------------------------------------
// Derived Types — Data Lock
// ---------------------------------------------------------------------------

/** Entity khóa kỳ đầy đủ — dùng trong DataLockPanel, Store */
export type DataLock = z.infer<typeof dataLockSchema>;

/** Union type loại khóa */
export type LockType = z.infer<typeof lockTypeEnum>;

// ---------------------------------------------------------------------------
// Constants — Data Lock Config
// ---------------------------------------------------------------------------

/**
 * Cấu hình hiển thị theo loại khóa kỳ.
 * Dùng trong: DataLockPanel, LockBadge.
 */
export const LOCK_TYPE_CONFIG: Record<
  LockType,
  { label_vi: string; icon: string; description: string }
> = {
  attendance_period: {
    label_vi: "Khóa kỳ chấm công",
    icon: "CalendarCheck",
    description: "Ngăn chỉnh sửa dữ liệu chấm công sau khi đã chốt kỳ",
  },
  payroll_period: {
    label_vi: "Khóa kỳ bảng lương",
    icon: "Banknote",
    description: "Ngăn chỉnh sửa bảng lương sau khi đã duyệt và thanh toán",
  },
};
