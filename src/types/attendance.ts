// ============================================================================
// GK-HRMS — Attendance Types
// Dùng cho: AttendanceTable, ShiftBadge, LeaveRequest flow, AttendanceStore
// Constraint: chỉ import từ zod
// Zod v4: dùng { error: "..." } thay { required_error: "..." }
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// AttendanceRecord Schema
// ---------------------------------------------------------------------------

/**
 * Bản ghi chấm công 1 ngày của 1 nhân viên.
 * Map 1:1 với document /attendance trong db.json.
 * Một ngày = một record (không tách shift con).
 */
export const attendanceRecordSchema = z.object({
  id: z
    .string({ error: "ID chấm công là bắt buộc" })
    .uuid("ID chấm công phải là UUID hợp lệ"),

  /** FK tới /employees */
  employeeId: z
    .string({ error: "Nhân viên là bắt buộc" })
    .uuid("employeeId phải là UUID hợp lệ"),

  /** Ngày làm việc — ISO date "YYYY-MM-DD" */
  date: z
    .string({ error: "Ngày làm việc là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  /** Ca làm việc trong ngày */
  shiftType: z.enum(["morning", "afternoon", "split"], {
    error: "Ca làm việc là bắt buộc",
  }),

  /**
   * Giờ vào ca — format "HH:mm" (24h).
   * null nếu chưa check-in hoặc vắng mặt.
   */
  checkIn: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Giờ vào phải theo định dạng HH:mm")
    .nullable(),

  /**
   * Giờ tan ca — format "HH:mm" (24h).
   * null nếu chưa check-out hoặc vắng mặt.
   */
  checkOut: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Giờ tan ca phải theo định dạng HH:mm")
    .nullable(),

  status: z.enum(["present", "late", "absent", "leave", "holiday"], {
    error: "Trạng thái chấm công là bắt buộc",
  }),

  /** Số phút đi muộn so với giờ bắt đầu ca (0 nếu đúng giờ) */
  lateMinutes: z
    .number()
    .min(0, "Số phút đi muộn không được âm")
    .default(0),

  /** Số giờ làm thêm ngoài ca chính thức */
  overtimeHours: z
    .number()
    .min(0, "Số giờ OT không được âm")
    .default(0),

  /**
   * ID của người phê duyệt (HR / Branch Manager).
   * null nếu chưa được duyệt hoặc không cần duyệt.
   */
  approvedBy: z.string().uuid("approvedBy phải là UUID hợp lệ").nullable(),

  /** Ghi chú: lý do muộn, lý do về sớm, ... */
  note: z.string().optional(),
});

/**
 * Schema form thêm / sửa chấm công.
 * Bỏ id để server tự sinh.
 */
export const attendanceFormSchema = attendanceRecordSchema.omit({ id: true });

// ---------------------------------------------------------------------------
// LeaveRequest Schema
// ---------------------------------------------------------------------------

/**
 * Đơn xin nghỉ phép của nhân viên.
 * Map 1:1 với document /leaves trong db.json.
 * Sau khi approved → tạo AttendanceRecord với status = "leave".
 */
export const leaveRequestSchema = z.object({
  id: z
    .string({ error: "ID đơn nghỉ phép là bắt buộc" })
    .uuid("ID đơn nghỉ phép phải là UUID hợp lệ"),

  /** FK tới /employees */
  employeeId: z
    .string({ error: "Nhân viên là bắt buộc" })
    .uuid("employeeId phải là UUID hợp lệ"),

  /** Loại nghỉ phép theo quy định Lao động VN */
  type: z.enum(["annual", "sick", "maternity", "unpaid"], {
    error: "Loại nghỉ phép là bắt buộc",
  }),

  /** Ngày bắt đầu nghỉ — ISO date "YYYY-MM-DD" */
  startDate: z
    .string({ error: "Ngày bắt đầu nghỉ là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  /** Ngày kết thúc nghỉ — ISO date "YYYY-MM-DD" */
  endDate: z
    .string({ error: "Ngày kết thúc nghỉ là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  /** Tổng số ngày nghỉ (tính ngày làm việc, không tính T7 CN) */
  totalDays: z
    .number({ error: "Số ngày nghỉ là bắt buộc" })
    .min(0.5, "Số ngày nghỉ tối thiểu là 0.5 ngày")
    .max(365, "Số ngày nghỉ tối đa là 365 ngày"),

  status: z.enum(["pending", "approved", "rejected"], {
    error: "Trạng thái đơn nghỉ là bắt buộc",
  }),

  /** Lý do xin nghỉ — bắt buộc, tối thiểu 10 ký tự */
  reason: z
    .string({ error: "Lý do nghỉ phép là bắt buộc" })
    .min(10, "Lý do phải có ít nhất 10 ký tự"),

  /**
   * ID người phê duyệt (HR Manager hoặc Branch Manager).
   * null khi chưa được xử lý.
   */
  approvedBy: z.string().uuid("approvedBy phải là UUID hợp lệ").nullable(),
});

/**
 * Schema form tạo / sửa đơn nghỉ phép.
 * Bỏ id, approvedBy, status vì server/admin xử lý.
 */
export const leaveFormSchema = leaveRequestSchema
  .omit({ id: true, approvedBy: true, status: true })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu nghỉ",
      });
    }
  });

// ---------------------------------------------------------------------------
// Derived Types
// ---------------------------------------------------------------------------

/** Bản ghi chấm công đầy đủ — dùng trong store, table */
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;

/** Payload khi thêm / sửa chấm công */
export type AttendanceFormData = z.infer<typeof attendanceFormSchema>;

/** Đơn nghỉ phép đầy đủ — dùng trong store, table */
export type LeaveRequest = z.infer<typeof leaveRequestSchema>;

/** Payload khi tạo đơn nghỉ phép (không có id, status, approvedBy) */
export type LeaveFormData = z.infer<typeof leaveFormSchema>;

/** Union type ca làm việc */
export type ShiftType = AttendanceRecord["shiftType"];

/** Union type trạng thái chấm công */
export type AttendanceStatus = AttendanceRecord["status"];

/** Union type loại nghỉ phép */
export type LeaveType = LeaveRequest["type"];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Cấu hình ca làm việc đặc thù F&B nhà hàng Lẩu Nấm Gia Khánh.
 *
 * - morning:   Ca hành chính sáng (bếp mở cửa, phục vụ trưa)
 * - afternoon: Ca chiều tối (cao điểm tối nhà hàng)
 * - split:     Ca gãy — nghỉ giữa giờ buổi trưa (đặc thù F&B, tránh giờ thấp điểm)
 *
 * breakDuration: phút nghỉ giữa ca (không tính công)
 */
export const SHIFT_CONFIG: Record<
  ShiftType,
  {
    label: string;
    /** Giờ bắt đầu ca — "HH:mm" */
    start: string;
    /** Giờ kết thúc ca — "HH:mm" */
    end: string;
    /** Phút nghỉ giữa ca */
    breakDuration: number;
    /** Mô tả chi tiết về ca (dùng trong tooltip) */
    description: string;
  }
> = {
  morning: {
    label: "Ca sáng",
    start: "07:00",
    end: "15:00",
    breakDuration: 30,
    description: "07:00 – 15:00 (nghỉ 30 phút)",
  },
  afternoon: {
    label: "Ca chiều",
    start: "15:00",
    end: "23:00",
    breakDuration: 30,
    description: "15:00 – 23:00 (nghỉ 30 phút)",
  },
  split: {
    label: "Ca gãy",
    start: "10:00",
    end: "22:00",
    breakDuration: 180, // nghỉ 3 tiếng giữa trưa: 14:00-17:00
    description: "10:00 – 14:00 + 17:00 – 22:00 (nghỉ giữa 3 tiếng)",
  },
};

/**
 * Cấu hình hiển thị theo trạng thái chấm công.
 * Dùng trong: AttendanceTable badge, ShiftBadge, báo cáo chấm công.
 */
export const ATTENDANCE_STATUS_CONFIG: Record<
  AttendanceStatus,
  { label_vi: string; badgeColor: string; icon: string }
> = {
  present: {
    label_vi: "Có mặt",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: "CheckCircle2",
  },
  late: {
    label_vi: "Đi muộn",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    icon: "AlarmClock",
  },
  absent: {
    label_vi: "Vắng mặt",
    badgeColor: "bg-red-100 text-red-600 border-red-200",
    icon: "XCircle",
  },
  leave: {
    label_vi: "Nghỉ phép",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "Calendar",
  },
  holiday: {
    label_vi: "Ngày lễ",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "PartyPopper",
  },
};

/**
 * Cấu hình hiển thị loại nghỉ phép.
 * Dùng trong: LeaveRequestForm, LeaveTable.
 */
export const LEAVE_TYPE_CONFIG: Record<
  LeaveType,
  { label_vi: string; maxDaysPerYear: number; description: string }
> = {
  annual: {
    label_vi: "Phép năm",
    maxDaysPerYear: 12,
    description: "Nghỉ phép thường niên theo quy định",
  },
  sick: {
    label_vi: "Ốm đau",
    maxDaysPerYear: 30,
    description: "Nghỉ ốm có giấy xác nhận của cơ sở y tế",
  },
  maternity: {
    label_vi: "Thai sản",
    maxDaysPerYear: 180,
    description: "Nghỉ thai sản 6 tháng theo Luật Lao động",
  },
  unpaid: {
    label_vi: "Không lương",
    maxDaysPerYear: 30,
    description: "Nghỉ không hưởng lương theo thỏa thuận",
  },
};

// ---------------------------------------------------------------------------
// ShiftAssignment Schema
// ---------------------------------------------------------------------------

/** Ca làm việc cho phân ca — bao gồm 'off' (nghỉ) */
export const shiftAssignmentTypeEnum = z.enum([
  "morning",
  "afternoon",
  "split",
  "off",
]);
export type ShiftAssignmentType = z.infer<typeof shiftAssignmentTypeEnum>;

/**
 * Phân ca làm việc cho 1 NV trong 1 ngày.
 * Map 1:1 với document /shift-assignments trong db.json.
 * 1 NV chỉ có 1 assignment / ngày.
 */
export const shiftAssignmentSchema = z.object({
  id: z
    .string({ error: "ID phân ca là bắt buộc" })
    .min(1, "ID phân ca là bắt buộc"),

  /** FK tới /employees */
  employeeId: z
    .string({ error: "Vui lòng chọn nhân viên" })
    .min(1, "Vui lòng chọn nhân viên"),

  /** FK tới chi nhánh */
  branchId: z.string().min(1, "Chi nhánh là bắt buộc"),

  /** Ngày phân ca — ISO date "YYYY-MM-DD" */
  date: z
    .string({ error: "Vui lòng chọn ngày" })
    .min(1, "Vui lòng chọn ngày"),

  /** Loại ca */
  shiftType: shiftAssignmentTypeEnum,

  /** Người phân ca */
  assignedBy: z.string().min(1, "Người phân ca là bắt buộc"),

  /** Ghi chú — optional */
  note: z.string().optional(),

  /** ISO 8601 datetime */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Schema dùng cho form phân ca.
 * Bỏ id, assignedBy, branchId, timestamps vì tự sinh.
 */
export const shiftAssignmentFormSchema = shiftAssignmentSchema.omit({
  id: true,
  assignedBy: true,
  branchId: true,
  createdAt: true,
  updatedAt: true,
});

// ---------------------------------------------------------------------------
// Derived Types — ShiftAssignment
// ---------------------------------------------------------------------------

/** Entity phân ca đầy đủ */
export type ShiftAssignment = z.infer<typeof shiftAssignmentSchema>;

/** Payload form phân ca */
export type ShiftAssignmentFormData = z.infer<typeof shiftAssignmentFormSchema>;

// ---------------------------------------------------------------------------
// Shift Assignment Config
// ---------------------------------------------------------------------------

export const SHIFT_ASSIGNMENT_CONFIG: Record<
  ShiftAssignmentType,
  { label_vi: string; shortLabel: string; time: string; color: string; bgColor: string }
> = {
  morning:   { label_vi: "Ca sáng",  shortLabel: "S", time: "07:00 - 15:00",                color: "text-blue-700",   bgColor: "bg-blue-100" },
  afternoon: { label_vi: "Ca chiều", shortLabel: "C", time: "15:00 - 23:00",                color: "text-orange-700", bgColor: "bg-orange-100" },
  split:     { label_vi: "Ca gãy",   shortLabel: "G", time: "10:00-14:00 & 17:00-22:00",    color: "text-purple-700", bgColor: "bg-purple-100" },
  off:       { label_vi: "Nghỉ",     shortLabel: "—", time: "",                              color: "text-slate-400",  bgColor: "bg-slate-100" },
};

// ---------------------------------------------------------------------------
// Monthly Summary (Tổng hợp bảng công)
// ---------------------------------------------------------------------------

/** Trạng thái tổng hợp bảng công */
export const summaryStatusEnum = z.enum(["draft", "confirmed", "locked"]);
export type SummaryStatus = z.infer<typeof summaryStatusEnum>;

/**
 * Tổng hợp bảng công 1 NV trong 1 tháng.
 * Map 1:1 với document /monthly-summaries trong db.json.
 */
export interface MonthlySummaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  totalWorkDays: number;
  totalLateDays: number;
  totalLateMinutes: number;
  totalAbsentDays: number;
  totalLeaveDays: number;
  totalOvertimeHours: number;
  totalHolidayDays: number;
  standardWorkDays: number;
  status: SummaryStatus;
  createdAt: string;
  updatedAt: string;
}

/** Extended row dùng cho bảng hiển thị */
export interface MonthlySummaryRow extends MonthlySummaryRecord {
  department: string;
  branchName: string;
}

// ---------------------------------------------------------------------------
// Vietnam Holidays 2026
// ---------------------------------------------------------------------------

export const HOLIDAYS_2026 = [
  "2026-01-01", // Tết Dương lịch
  "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", // Tết Nguyên Đán
  "2026-04-30", // Giải phóng miền Nam
  "2026-05-01", // Quốc tế Lao động
  "2026-09-02", // Quốc khánh
];
