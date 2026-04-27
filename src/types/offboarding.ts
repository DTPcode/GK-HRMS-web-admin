// ============================================================================
// GK-HRMS — Offboarding Types (Nghỉ việc)
// Dùng cho: ResignationTable, ResignationForm, OffboardingStore
// Constraint: chỉ import từ zod
// Zod v4: dùng { error: "..." } thay { required_error: "..." }
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Loại nghỉ việc */
export const resignationTypeEnum = z.enum(
  ["voluntary", "terminated", "retired", "contract_end"],
  { error: "Loại nghỉ việc là bắt buộc" }
);

/** Trạng thái đơn nghỉ việc — workflow: pending → approved/rejected → completed */
export const resignationStatusEnum = z.enum(
  ["pending", "approved", "rejected", "completed"],
  { error: "Trạng thái đơn nghỉ việc là bắt buộc" }
);

// ---------------------------------------------------------------------------
// Zod Schema — resignationRequestSchema
// ---------------------------------------------------------------------------

/**
 * Schema đầy đủ của Đơn nghỉ việc.
 * Map 1:1 với document /resignations trong db.json.
 */
export const resignationRequestSchema = z.object({
  id: z
    .string({ error: "ID đơn nghỉ việc là bắt buộc" })
    .uuid("ID đơn nghỉ việc phải là UUID hợp lệ"),

  employeeId: z
    .string({ error: "ID nhân viên là bắt buộc" })
    .min(1, "ID nhân viên là bắt buộc"),

  /** Ngày nộp đơn — ISO date "YYYY-MM-DD" */
  submittedDate: z
    .string({ error: "Ngày nộp đơn là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  /** Ngày làm việc cuối cùng — ISO date "YYYY-MM-DD" */
  lastWorkingDate: z
    .string({ error: "Ngày làm việc cuối cùng là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  reason: z
    .string({ error: "Lý do nghỉ việc là bắt buộc" })
    .min(10, "Lý do nghỉ việc phải có ít nhất 10 ký tự"),

  type: resignationTypeEnum,

  status: resignationStatusEnum,

  /** userId người phê duyệt — null nếu chưa duyệt */
  approvedBy: z.string().nullable(),

  /** ISO datetime phê duyệt — null nếu chưa duyệt */
  approvedAt: z
    .string()
    .datetime({ message: "approvedAt phải là ISO datetime" })
    .nullable(),

  /** Ghi chú bàn giao công việc, thiết bị, v.v. */
  handoverNote: z
    .string()
    .max(1000, "Ghi chú bàn giao không được vượt quá 1000 ký tự")
    .optional(),

  /** Thời điểm vô hiệu hóa tài khoản hệ thống — null nếu chưa deactivate */
  accountDeactivatedAt: z
    .string()
    .datetime({ message: "accountDeactivatedAt phải là ISO datetime" })
    .nullable(),

  /** ISO 8601 datetime — do server tự sinh */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),

  /** ISO 8601 datetime — tự cập nhật khi edit */
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Schema dùng cho ResignationForm (tạo mới / chỉnh sửa).
 * Bỏ id, status, approvedBy, approvedAt, accountDeactivatedAt, timestamps
 * vì server/workflow quản lý.
 */
export const resignationFormSchema = resignationRequestSchema.omit({
  id: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  accountDeactivatedAt: true,
  createdAt: true,
  updatedAt: true,
});

// ---------------------------------------------------------------------------
// Derived Types
// ---------------------------------------------------------------------------

/** Entity đơn nghỉ việc đầy đủ — dùng trong store, table */
export type ResignationRequest = z.infer<typeof resignationRequestSchema>;

/** Payload gửi lên khi tạo / cập nhật đơn nghỉ việc */
export type ResignationFormData = z.infer<typeof resignationFormSchema>;

/** Union type loại nghỉ việc */
export type ResignationType = z.infer<typeof resignationTypeEnum>;

/** Union type trạng thái đơn nghỉ việc */
export type ResignationStatus = z.infer<typeof resignationStatusEnum>;

// ---------------------------------------------------------------------------
// Constants — Config hiển thị
// ---------------------------------------------------------------------------

/**
 * Cấu hình hiển thị theo loại nghỉ việc.
 * Dùng trong: ResignationTypeBadge, ResignationForm Select.
 */
export const RESIGNATION_TYPE_CONFIG: Record<
  ResignationType,
  { label_vi: string; icon: string }
> = {
  voluntary: {
    label_vi: "Tự nguyện nghỉ",
    icon: "UserMinus",
  },
  terminated: {
    label_vi: "Bị cho thôi việc",
    icon: "UserX",
  },
  retired: {
    label_vi: "Nghỉ hưu",
    icon: "Armchair",
  },
  contract_end: {
    label_vi: "Hết hợp đồng",
    icon: "FileX2",
  },
};

/**
 * Cấu hình hiển thị theo trạng thái đơn nghỉ việc.
 * workflowStep: thứ tự trong workflow — dùng cho progress indicator.
 * Dùng trong: ResignationStatusBadge, ResignationTable, WorkflowStepper.
 */
export const RESIGNATION_STATUS_CONFIG: Record<
  ResignationStatus,
  { label_vi: string; badgeColor: string; workflowStep: number }
> = {
  pending: {
    label_vi: "Chờ duyệt",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    workflowStep: 1,
  },
  approved: {
    label_vi: "Đã duyệt",
    badgeColor: "bg-sky-100 text-sky-700 border-sky-200",
    workflowStep: 2,
  },
  rejected: {
    label_vi: "Từ chối",
    badgeColor: "bg-red-100 text-red-600 border-red-200",
    workflowStep: 2,
  },
  completed: {
    label_vi: "Hoàn tất",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    workflowStep: 3,
  },
};
