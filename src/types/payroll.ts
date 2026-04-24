// ============================================================================
// GK-HRMS — Payroll Types
// Dùng cho: PayrollTable, SalaryBreakdown, PayrollStore, ConfirmPaymentDialog
// Constraint: chỉ import từ zod — KHÔNG import từ ./common
// Zod v4: dùng { error: "..." } thay { required_error: "..." }
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod Schema — payrollRecordSchema
// ---------------------------------------------------------------------------

/**
 * Bảng lương tháng cho 1 nhân viên.
 * Map 1:1 với document /payroll trong db.json.
 * grossSalary & netSalary là computed fields — server hoặc store tính.
 */
export const payrollRecordSchema = z.object({
  id: z
    .string({ error: "ID bảng lương là bắt buộc" })
    .uuid("ID bảng lương phải là UUID hợp lệ"),

  /** FK tới /employees */
  employeeId: z
    .string({ error: "Nhân viên là bắt buộc" })
    .uuid("employeeId phải là UUID hợp lệ"),

  /** Kỳ lương — format "YYYY-MM" */
  month: z
    .string({ error: "Kỳ lương là bắt buộc" })
    .regex(/^\d{4}-\d{2}$/, "Kỳ lương phải theo định dạng YYYY-MM"),

  /** Lương cơ bản theo hợp đồng (VND) */
  baseSalary: z
    .number({ error: "Lương cơ bản là bắt buộc" })
    .min(0, "Lương cơ bản không được âm"),

  /**
   * Các khoản phụ cấp — key là tên khoản, value là số tiền VND.
   * Ví dụ: { "xe": 300000, "com": 500000, "dien_thoai": 200000 }
   */
  allowances: z.record(
    z.string(),
    z.number().min(0, "Phụ cấp không được âm"),
    { error: "Phụ cấp là bắt buộc" }
  ),

  /**
   * Các khoản khấu trừ — key là tên khoản, value là số tiền VND.
   * Ví dụ: { "BHXH": 800000, "TNCN": 500000, "tamung": 1000000 }
   */
  deductions: z.record(
    z.string(),
    z.number().min(0, "Khoản khấu trừ không được âm"),
    { error: "Khấu trừ là bắt buộc" }
  ),

  /** Thưởng tháng (VND) — performance, KPI, thưởng doanh số... */
  bonus: z
    .number()
    .min(0, "Thưởng không được âm")
    .default(0),

  /** Phạt tháng (VND) — vi phạm nội quy, đi muộn... */
  penalty: z
    .number()
    .min(0, "Phạt không được âm")
    .default(0),

  /** Tổng ngày công chuẩn trong tháng (thường 22-26 ngày) */
  totalWorkDays: z
    .number({ error: "Số ngày công chuẩn là bắt buộc" })
    .min(0, "Số ngày công không được âm")
    .max(31, "Số ngày công tối đa là 31"),

  /** Số ngày công thực tế đi làm */
  actualWorkDays: z
    .number({ error: "Số ngày công thực tế là bắt buộc" })
    .min(0, "Số ngày công thực tế không được âm")
    .max(31, "Số ngày công thực tế tối đa là 31"),

  /** Tổng giờ OT trong tháng */
  overtimeHours: z
    .number()
    .min(0, "Giờ OT không được âm")
    .default(0),

  /** Tiền OT (VND) — tính theo hệ số OT × lương giờ */
  overtimePay: z
    .number()
    .min(0, "Tiền OT không được âm")
    .default(0),

  /**
   * Tổng thu nhập (VND).
   * Computed: baseSalary + sum(allowances) + bonus + overtimePay - penalty
   */
  grossSalary: z
    .number({ error: "Tổng thu nhập là bắt buộc" })
    .min(0, "Tổng thu nhập không được âm"),

  /**
   * Thực lĩnh (VND).
   * Computed: grossSalary - sum(deductions)
   */
  netSalary: z
    .number({ error: "Thực lĩnh là bắt buộc" })
    .min(0, "Thực lĩnh không được âm"),

  status: z.enum(["draft", "pending_approval", "approved", "paid"], {
    error: "Trạng thái bảng lương là bắt buộc",
  }),

  /**
   * ID người phê duyệt (HR Manager).
   * null khi chưa được duyệt.
   */
  approvedBy: z.string().uuid("approvedBy phải là UUID hợp lệ").nullable(),

  /** Ngày chi lương thực tế — ISO date. null nếu chưa trả */
  paidAt: z.string().datetime({ message: "paidAt phải là ISO datetime" }).nullable(),

  /** Ghi chú: điều chỉnh lương, lý do thưởng/phạt... */
  note: z.string().optional(),

  /** ISO 8601 datetime — do server tự sinh */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),

  /** ISO 8601 datetime — tự cập nhật khi edit */
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

// ---------------------------------------------------------------------------
// Derived Types
// ---------------------------------------------------------------------------

/** Bản ghi bảng lương đầy đủ — dùng trong store, table, detail */
export type PayrollRecord = z.infer<typeof payrollRecordSchema>;

/** Union type trạng thái bảng lương */
export type PayrollStatus = PayrollRecord["status"];

// ---------------------------------------------------------------------------
// PayrollSummary — tổng hợp cho Dashboard / Reports
// ---------------------------------------------------------------------------

/**
 * Thống kê tổng hợp bảng lương theo tháng.
 * Dùng trong: DashboardClient, PayrollSummaryCard, Reports.
 */
export interface PayrollSummary {
  /** Kỳ lương "YYYY-MM" */
  month: string;
  /** Tổng số nhân viên trong kỳ */
  totalEmployees: number;
  /** Tổng thu nhập toàn công ty (VND) */
  totalGross: number;
  /** Tổng thực lĩnh toàn công ty (VND) */
  totalNet: number;
  /** Tổng tiền OT toàn công ty (VND) */
  totalOvertime: number;
  /**
   * Phân bổ theo phòng ban.
   * Key: tên phòng ban (e.g. "Bếp", "Phục vụ").
   */
  byDepartment: Record<string, { headCount: number; totalNet: number }>;
}

// ---------------------------------------------------------------------------
// Payment Flow Types — dùng cho ConfirmPaymentDialog
// ---------------------------------------------------------------------------

/** Hình thức thanh toán lương */
export type PaymentMethod = "cash" | "bank_transfer";

/**
 * Payload khi xác nhận thanh toán lương.
 * Dùng trong: ConfirmPaymentDialog → payrollStore.markAsPaid()
 */
export interface PaymentData {
  paymentMethod: PaymentMethod;
  /** Ngày chi thực tế "YYYY-MM-DD" */
  paidAt: string;
  /** Ghi chú thanh toán (nội dung chuyển khoản, biên nhận...) */
  note: string;
}

// ---------------------------------------------------------------------------
// PayrollFilter — dùng cho PayrollTable filter
// ---------------------------------------------------------------------------

/**
 * Params lọc bảng lương.
 * Dùng trong: payrollStore.filter, PayrollPageClient.
 */
export interface PayrollFilter {
  /** Kỳ lương "YYYY-MM" */
  period?: string;
  /** Lọc theo nhân viên */
  employeeId?: string;
  /** Lọc theo chi nhánh */
  branchId?: string;
  /** Lọc theo trạng thái */
  status?: PayrollStatus;
}

// ---------------------------------------------------------------------------
// PayrollTableRow — dùng cho PayrollTable (join thông tin NV)
// ---------------------------------------------------------------------------

/**
 * Row bảng lương — kèm thông tin nhân viên đã join.
 * Dùng trong: PayrollTable để hiển thị tên, phòng ban, chi nhánh.
 */
export interface PayrollTableRow extends PayrollRecord {
  employeeName: string;
  department: string;
  branchName: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Cấu hình hiển thị theo trạng thái bảng lương.
 * Workflow: draft → pending_approval → approved → paid
 * Dùng trong: PayrollTable badge, PayrollFilter, PayrollPageClient.
 */
export const PAYROLL_STATUS_CONFIG: Record<
  PayrollStatus,
  {
    label_vi: string;
    badgeColor: string;
    /** Lucide icon name */
    icon: string;
    /** Thứ tự trong workflow (dùng để sort/validate transition) */
    step: number;
  }
> = {
  draft: {
    label_vi: "Nháp",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "FileEdit",
    step: 1,
  },
  pending_approval: {
    label_vi: "Chờ duyệt",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    icon: "Clock",
    step: 2,
  },
  approved: {
    label_vi: "Đã duyệt",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "CheckCircle2",
    step: 3,
  },
  paid: {
    label_vi: "Đã chi",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: "Banknote",
    step: 4,
  },
};
