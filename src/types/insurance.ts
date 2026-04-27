// ============================================================================
// GK-HRMS — Insurance Types (Bảo hiểm)
// Dùng cho: InsuranceTable, InsuranceForm, InsuranceStore, PayrollCalculation
// Constraint: chỉ import từ zod
// Zod v4: dùng { error: "..." } thay { required_error: "..." }
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Trạng thái bảo hiểm */
export const insuranceStatusEnum = z.enum(
  ["active", "suspended", "terminated"],
  { error: "Trạng thái bảo hiểm là bắt buộc" }
);

// ---------------------------------------------------------------------------
// Constants — Tỷ lệ BHXH/BHYT/BHTN theo Luật VN 2024
// ---------------------------------------------------------------------------

/**
 * Tỷ lệ đóng bảo hiểm mặc định theo quy định hiện hành (2024).
 * Nguồn: Luật BHXH 2014 sửa đổi + NĐ 58/2020/NĐ-CP.
 *
 * - employee: phần người lao động đóng
 * - employer: phần người sử dụng lao động đóng
 */
export const INSURANCE_RATE_CONFIG = {
  bhxh: {
    label_vi: "BHXH (Bảo hiểm xã hội)",
    employee: 0.08,
    employer: 0.175,
  },
  bhyt: {
    label_vi: "BHYT (Bảo hiểm y tế)",
    employee: 0.015,
    employer: 0.03,
  },
  bhtn: {
    label_vi: "BHTN (Bảo hiểm thất nghiệp)",
    employee: 0.01,
    employer: 0.01,
  },
  /** Tổng tỷ lệ — dùng cho quick calculation */
  total: {
    employee: 0.08 + 0.015 + 0.01,   // = 10.5%
    employer: 0.175 + 0.03 + 0.01,    // = 21.5%
  },
} as const;

// ---------------------------------------------------------------------------
// Zod Schema — insuranceRecordSchema
// ---------------------------------------------------------------------------

/**
 * Schema đầy đủ của bản ghi Bảo hiểm nhân viên.
 * Map 1:1 với document /insurance trong db.json.
 * Mỗi NV có 1 bản ghi active tại 1 thời điểm.
 */
export const insuranceRecordSchema = z.object({
  id: z
    .string({ error: "ID bảo hiểm là bắt buộc" })
    .uuid("ID bảo hiểm phải là UUID hợp lệ"),

  employeeId: z
    .string({ error: "ID nhân viên là bắt buộc" })
    .min(1, "ID nhân viên là bắt buộc"),

  /** Mức lương đóng BH — có thể khác lương ghi trên hợp đồng */
  insuredSalary: z
    .number({ error: "Mức lương đóng BH là bắt buộc" })
    .min(0, "Mức lương đóng BH không được âm"),

  // -- Tỷ lệ người lao động đóng --
  bhxhRate: z
    .number({ error: "Tỷ lệ BHXH là bắt buộc" })
    .min(0, "Tỷ lệ BHXH không được âm")
    .max(1, "Tỷ lệ BHXH phải nhỏ hơn 100%")
    .default(INSURANCE_RATE_CONFIG.bhxh.employee),

  bhytRate: z
    .number({ error: "Tỷ lệ BHYT là bắt buộc" })
    .min(0, "Tỷ lệ BHYT không được âm")
    .max(1, "Tỷ lệ BHYT phải nhỏ hơn 100%")
    .default(INSURANCE_RATE_CONFIG.bhyt.employee),

  bhtnRate: z
    .number({ error: "Tỷ lệ BHTN là bắt buộc" })
    .min(0, "Tỷ lệ BHTN không được âm")
    .max(1, "Tỷ lệ BHTN phải nhỏ hơn 100%")
    .default(INSURANCE_RATE_CONFIG.bhtn.employee),

  // -- Tỷ lệ người sử dụng lao động đóng --
  bhxhEmployer: z
    .number({ error: "Tỷ lệ BHXH công ty là bắt buộc" })
    .min(0, "Tỷ lệ BHXH công ty không được âm")
    .max(1, "Tỷ lệ BHXH công ty phải nhỏ hơn 100%")
    .default(INSURANCE_RATE_CONFIG.bhxh.employer),

  bhytEmployer: z
    .number({ error: "Tỷ lệ BHYT công ty là bắt buộc" })
    .min(0, "Tỷ lệ BHYT công ty không được âm")
    .max(1, "Tỷ lệ BHYT công ty phải nhỏ hơn 100%")
    .default(INSURANCE_RATE_CONFIG.bhyt.employer),

  bhtnEmployer: z
    .number({ error: "Tỷ lệ BHTN công ty là bắt buộc" })
    .min(0, "Tỷ lệ BHTN công ty không được âm")
    .max(1, "Tỷ lệ BHTN công ty phải nhỏ hơn 100%")
    .default(INSURANCE_RATE_CONFIG.bhtn.employer),

  /** Ngày bắt đầu đóng BH — ISO date "YYYY-MM-DD" */
  startDate: z
    .string({ error: "Ngày bắt đầu là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  /** Ngày kết thúc — null nếu đang active */
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD")
    .nullable(),

  status: insuranceStatusEnum,

  note: z
    .string()
    .max(500, "Ghi chú không được vượt quá 500 ký tự")
    .optional(),

  /** ISO 8601 datetime — do server tự sinh */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),

  /** ISO 8601 datetime — tự cập nhật khi edit */
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Schema dùng cho InsuranceForm (tạo mới / chỉnh sửa).
 * Bỏ id, createdAt, updatedAt vì server quản lý.
 */
export const insuranceFormSchema = insuranceRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ---------------------------------------------------------------------------
// Derived Types
// ---------------------------------------------------------------------------

/** Entity bảo hiểm đầy đủ — dùng trong store, table */
export type InsuranceRecord = z.infer<typeof insuranceRecordSchema>;

/** Payload gửi lên khi tạo / cập nhật bảo hiểm */
export type InsuranceFormData = z.infer<typeof insuranceFormSchema>;

/** Union type trạng thái bảo hiểm */
export type InsuranceStatus = z.infer<typeof insuranceStatusEnum>;

// ---------------------------------------------------------------------------
// InsuranceSummary — Computed type dùng cho UI hiển thị
// ---------------------------------------------------------------------------

/**
 * Tóm tắt đóng BH hàng tháng — được tính từ InsuranceRecord, KHÔNG lưu DB.
 * Dùng trong: InsuranceCard, PayrollSalaryBreakdown, EmployeeDetail.
 */
export interface InsuranceSummary {
  /** Tổng NV đóng/tháng = insuredSalary × (bhxhRate + bhytRate + bhtnRate) */
  employeeContribution: number;
  /** Tổng công ty đóng/tháng = insuredSalary × (bhxhEmployer + bhytEmployer + bhtnEmployer) */
  employerContribution: number;
  /** Tổng cộng = employeeContribution + employerContribution */
  totalContribution: number;
}

// ---------------------------------------------------------------------------
// Helper — computeInsuranceSummary
// ---------------------------------------------------------------------------

/**
 * Tính toán InsuranceSummary từ InsuranceRecord.
 * Pure function — no side effects, dễ test.
 */
export function computeInsuranceSummary(
  record: Pick<
    InsuranceRecord,
    | "insuredSalary"
    | "bhxhRate"
    | "bhytRate"
    | "bhtnRate"
    | "bhxhEmployer"
    | "bhytEmployer"
    | "bhtnEmployer"
  >
): InsuranceSummary {
  const employeeContribution =
    record.insuredSalary *
    (record.bhxhRate + record.bhytRate + record.bhtnRate);

  const employerContribution =
    record.insuredSalary *
    (record.bhxhEmployer + record.bhytEmployer + record.bhtnEmployer);

  return {
    employeeContribution: Math.round(employeeContribution),
    employerContribution: Math.round(employerContribution),
    totalContribution: Math.round(employeeContribution + employerContribution),
  };
}

// ---------------------------------------------------------------------------
// Constants — Config hiển thị
// ---------------------------------------------------------------------------

/**
 * Cấu hình hiển thị theo trạng thái bảo hiểm.
 * Dùng trong: InsuranceStatusBadge, InsuranceTable.
 */
export const INSURANCE_STATUS_CONFIG: Record<
  InsuranceStatus,
  { label_vi: string; badgeColor: string }
> = {
  active: {
    label_vi: "Đang tham gia",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  suspended: {
    label_vi: "Tạm dừng",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
  },
  terminated: {
    label_vi: "Đã ngừng",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
};
