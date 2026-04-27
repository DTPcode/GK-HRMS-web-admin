// ============================================================================
// GK-HRMS — Reward & Discipline Types
// Dùng cho: RewardTable, DisciplineTable, RewardForm, DisciplineForm, Store
// Constraint: chỉ import từ zod
// Zod v4: dùng { error: "..." } thay { required_error: "..." }
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Loại khen thưởng */
export const rewardTypeEnum = z.enum(["bonus", "commendation", "certificate"], {
  error: "Loại khen thưởng là bắt buộc",
});

/** Loại kỷ luật */
export const disciplineTypeEnum = z.enum(
  ["warning", "fine", "suspend", "dismiss"],
  { error: "Loại kỷ luật là bắt buộc" }
);

/** Trạng thái kỷ luật */
export const disciplineStatusEnum = z.enum(
  ["active", "expired", "appealed"],
  { error: "Trạng thái kỷ luật là bắt buộc" }
);

// ---------------------------------------------------------------------------
// Zod Schema — rewardRecordSchema
// ---------------------------------------------------------------------------

/**
 * Schema đầy đủ của bản ghi Khen thưởng.
 * Map 1:1 với document /rewards trong db.json.
 */
export const rewardRecordSchema = z.object({
  id: z
    .string({ error: "ID khen thưởng là bắt buộc" })
    .uuid("ID khen thưởng phải là UUID hợp lệ"),

  employeeId: z
    .string({ error: "ID nhân viên là bắt buộc" })
    .min(1, "ID nhân viên là bắt buộc"),

  type: rewardTypeEnum,

  title: z
    .string({ error: "Tên danh hiệu là bắt buộc" })
    .min(2, "Tên danh hiệu phải có ít nhất 2 ký tự")
    .max(200, "Tên danh hiệu không được vượt quá 200 ký tự"),

  /** Tiền thưởng VND — 0 nếu khen thưởng không kèm tiền */
  amount: z
    .number({ error: "Số tiền thưởng là bắt buộc" })
    .min(0, "Số tiền thưởng không được âm"),

  reason: z
    .string({ error: "Lý do khen thưởng là bắt buộc" })
    .min(10, "Lý do khen thưởng phải có ít nhất 10 ký tự"),

  /** Ngày có hiệu lực — ISO date "YYYY-MM-DD" */
  effectiveDate: z
    .string({ error: "Ngày hiệu lực là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  /** Liên kết vào bảng lương tháng — "YYYY-MM", null nếu không link */
  linkedPayrollMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Tháng lương phải theo định dạng YYYY-MM")
    .nullable(),

  /** userId người phê duyệt — null nếu chưa duyệt */
  approvedBy: z.string().nullable(),

  /** ISO 8601 datetime — do server tự sinh */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),

  /** ISO 8601 datetime — tự cập nhật khi edit */
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Schema dùng cho RewardForm (tạo mới / chỉnh sửa).
 * Bỏ id, approvedBy, createdAt, updatedAt vì server quản lý.
 */
export const rewardFormSchema = rewardRecordSchema.omit({
  id: true,
  approvedBy: true,
  createdAt: true,
  updatedAt: true,
});

// ---------------------------------------------------------------------------
// Zod Schema — disciplineRecordSchema
// ---------------------------------------------------------------------------

/**
 * Schema đầy đủ của bản ghi Kỷ luật.
 * Map 1:1 với document /disciplines trong db.json.
 */
export const disciplineRecordSchema = z.object({
  id: z
    .string({ error: "ID kỷ luật là bắt buộc" })
    .uuid("ID kỷ luật phải là UUID hợp lệ"),

  employeeId: z
    .string({ error: "ID nhân viên là bắt buộc" })
    .min(1, "ID nhân viên là bắt buộc"),

  type: disciplineTypeEnum,

  title: z
    .string({ error: "Hình thức kỷ luật là bắt buộc" })
    .min(2, "Hình thức kỷ luật phải có ít nhất 2 ký tự")
    .max(200, "Hình thức kỷ luật không được vượt quá 200 ký tự"),

  /** Số tiền phạt VND — 0 nếu kỷ luật không kèm phạt tiền */
  penaltyAmount: z
    .number({ error: "Số tiền phạt là bắt buộc" })
    .min(0, "Số tiền phạt không được âm"),

  reason: z
    .string({ error: "Lý do kỷ luật là bắt buộc" })
    .min(10, "Lý do kỷ luật phải có ít nhất 10 ký tự"),

  /** Ngày có hiệu lực — ISO date "YYYY-MM-DD" */
  effectiveDate: z
    .string({ error: "Ngày hiệu lực là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  /** Ngày kết thúc kỷ luật — null = vô thời hạn (e.g. sa thải) */
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD")
    .nullable(),

  /** Liên kết vào bảng lương tháng — "YYYY-MM", null nếu không link */
  linkedPayrollMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Tháng lương phải theo định dạng YYYY-MM")
    .nullable(),

  /** userId người phê duyệt — null nếu chưa duyệt */
  approvedBy: z.string().nullable(),

  status: disciplineStatusEnum,

  /** ISO 8601 datetime — do server tự sinh */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),

  /** ISO 8601 datetime — tự cập nhật khi edit */
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Schema dùng cho DisciplineForm (tạo mới / chỉnh sửa).
 * Bỏ id, approvedBy, status, createdAt, updatedAt vì server quản lý.
 */
export const disciplineFormSchema = disciplineRecordSchema.omit({
  id: true,
  approvedBy: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

// ---------------------------------------------------------------------------
// Derived Types
// ---------------------------------------------------------------------------

/** Entity khen thưởng đầy đủ — dùng trong store, table */
export type RewardRecord = z.infer<typeof rewardRecordSchema>;

/** Payload gửi lên khi tạo / cập nhật khen thưởng */
export type RewardFormData = z.infer<typeof rewardFormSchema>;

/** Union type loại khen thưởng */
export type RewardType = z.infer<typeof rewardTypeEnum>;

/** Entity kỷ luật đầy đủ — dùng trong store, table */
export type DisciplineRecord = z.infer<typeof disciplineRecordSchema>;

/** Payload gửi lên khi tạo / cập nhật kỷ luật */
export type DisciplineFormData = z.infer<typeof disciplineFormSchema>;

/** Union type loại kỷ luật */
export type DisciplineType = z.infer<typeof disciplineTypeEnum>;

/** Union type trạng thái kỷ luật */
export type DisciplineStatus = z.infer<typeof disciplineStatusEnum>;

// ---------------------------------------------------------------------------
// Constants — Config hiển thị
// ---------------------------------------------------------------------------

/**
 * Cấu hình hiển thị theo loại khen thưởng.
 * icon: tên icon lucide-react — import tại component.
 * Dùng trong: RewardBadge, RewardTable, RewardForm Select.
 */
export const REWARD_TYPE_CONFIG: Record<
  RewardType,
  { label_vi: string; icon: string; badgeColor: string }
> = {
  bonus: {
    label_vi: "Thưởng tiền",
    icon: "Banknote",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  commendation: {
    label_vi: "Biểu dương",
    icon: "Award",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
  },
  certificate: {
    label_vi: "Giấy khen",
    icon: "ScrollText",
    badgeColor: "bg-sky-100 text-sky-700 border-sky-200",
  },
};

/**
 * Cấu hình hiển thị theo loại kỷ luật.
 * severity: 1 (nhẹ) → 4 (nặng nhất) — dùng để sort, highlight.
 * Dùng trong: DisciplineBadge, DisciplineTable, DisciplineForm Select.
 */
export const DISCIPLINE_TYPE_CONFIG: Record<
  DisciplineType,
  { label_vi: string; icon: string; badgeColor: string; severity: number }
> = {
  warning: {
    label_vi: "Cảnh cáo",
    icon: "AlertTriangle",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    severity: 1,
  },
  fine: {
    label_vi: "Phạt tiền",
    icon: "CircleDollarSign",
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
    severity: 2,
  },
  suspend: {
    label_vi: "Đình chỉ",
    icon: "PauseCircle",
    badgeColor: "bg-red-100 text-red-600 border-red-200",
    severity: 3,
  },
  dismiss: {
    label_vi: "Sa thải",
    icon: "UserX",
    badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
    severity: 4,
  },
};

/**
 * Cấu hình hiển thị theo trạng thái kỷ luật.
 * Dùng trong: DisciplineStatusBadge, DisciplineTable.
 */
export const DISCIPLINE_STATUS_CONFIG: Record<
  DisciplineStatus,
  { label_vi: string; badgeColor: string }
> = {
  active: {
    label_vi: "Đang hiệu lực",
    badgeColor: "bg-red-100 text-red-600 border-red-200",
  },
  expired: {
    label_vi: "Đã hết hạn",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  appealed: {
    label_vi: "Đã khiếu nại",
    badgeColor: "bg-violet-100 text-violet-700 border-violet-200",
  },
};
