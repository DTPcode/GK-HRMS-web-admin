// ============================================================================
// GK-HRMS — Contract Types
// Dùng cho: ContractForm, ContractTable, ContractStore, ContractCard
// Constraint: chỉ import từ zod
// Zod v4: dùng { error: "..." } thay { required_error: "..." }
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod Schema — contractSchema
// ---------------------------------------------------------------------------

/**
 * Schema đầy đủ của hợp đồng lao động.
 * Map 1:1 với document /contracts trong db.json.
 * Một nhân viên có thể có nhiều hợp đồng (lịch sử ký lại).
 */

// Base object — KHÔNG có refinement để .omit() hoạt động trong Zod v4
const contractBaseSchema = z.object({
  id: z
    .string({ error: "ID hợp đồng là bắt buộc" })
    .min(1, "ID hợp đồng là bắt buộc"),

  /** FK tới /employees */
  employeeId: z
    .string({ error: "Nhân viên là bắt buộc" })
    .min(1, "Vui lòng chọn nhân viên"),

  type: z.enum(["probation", "fixed-term", "indefinite"], {
    error: "Loại hợp đồng là bắt buộc",
  }),

  /** Ngày bắt đầu hợp đồng — ISO date "YYYY-MM-DD" */
  startDate: z
    .string({ error: "Ngày bắt đầu hợp đồng là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),

  /**
   * Ngày kết thúc — null nếu hợp đồng không thời hạn (indefinite).
   * Bắt buộc khi type = "probation" | "fixed-term".
   */
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD")
    .nullable()
    .optional(),

  /** Lương cơ bản ghi trong hợp đồng (VND) */
  baseSalary: z
    .number({ error: "Lương cơ bản là bắt buộc" })
    .min(1_000_000, "Lương cơ bản tối thiểu là 1.000.000 VND")
    .max(500_000_000, "Lương cơ bản tối đa là 500.000.000 VND"),

  /** Tổng phụ cấp ghi trong hợp đồng (VND): xăng xe, ăn trưa, điện thoại... */
  allowances: z
    .number({ error: "Phụ cấp là bắt buộc" })
    .min(0, "Phụ cấp không được âm"),

  status: z.enum(["active", "expired", "terminated", "pending"], {
    error: "Trạng thái hợp đồng là bắt buộc",
  }),

  /**
   * URL file scan hợp đồng ký tay — lưu trên MinIO/S3.
   * Optional: chưa upload thì để trống.
   */
  documentUrl: z
    .string()
    .url("URL tài liệu hợp đồng không hợp lệ")
    .or(z.literal(""))
    .optional(),

  /** ISO 8601 datetime — do server tự sinh */
  createdAt: z
    .string()
    .datetime({ message: "createdAt phải là ISO datetime" }),

  /** ISO 8601 datetime — tự cập nhật khi edit */
  updatedAt: z
    .string()
    .datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Refinement logic dùng chung cho cả contractSchema và contractFormSchema.
 * Tách riêng để tránh lỗi Zod v4: `.omit() cannot be used on schemas with refinements`.
 */
type ContractLike = { type: string; startDate: string; endDate?: string | null };
const contractRefine = (data: ContractLike, ctx: z.RefinementCtx) => {
  // endDate bắt buộc khi không phải hợp đồng vô thời hạn
  if (data.type !== "indefinite" && !data.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message:
        "Ngày kết thúc là bắt buộc đối với hợp đồng thử việc và có thời hạn",
    });
  }
  // endDate phải sau startDate
  if (data.endDate && data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "Ngày kết thúc phải sau ngày bắt đầu",
    });
  }
};

/** Full schema (có refinement) — dùng khi parse data từ API */
export const contractSchema = contractBaseSchema.superRefine(contractRefine);

/**
 * Schema dùng cho ContractForm (tạo mới / chỉnh sửa).
 * Bỏ id, createdAt, updatedAt vì server tự sinh.
 * .omit() gọi trên base (không có refinement) → thêm refinement sau.
 */
export const contractFormSchema = contractBaseSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .superRefine(contractRefine);

// ---------------------------------------------------------------------------
// Derived Types
// ---------------------------------------------------------------------------

/** Entity hợp đồng lao động đầy đủ — dùng trong store, table, detail page */
export type Contract = z.infer<typeof contractSchema>;

/** Payload khi tạo / cập nhật hợp đồng (không có id, timestamps) */
export type ContractFormData = z.infer<typeof contractFormSchema>;

/** Union type loại hợp đồng */
export type ContractType = Contract["type"];

/** Union type trạng thái hợp đồng */
export type ContractStatus = Contract["status"];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Cấu hình hiển thị theo trạng thái hợp đồng.
 * icon: tên icon trong lucide-react (dùng map thủ công ở component).
 * Dùng trong: ContractCard status badge, ContractTable badge, ContractFilter.
 */
export const CONTRACT_STATUS_CONFIG: Record<
  ContractStatus,
  {
    label_vi: string;
    badgeColor: string;
    /** Tên icon lucide-react tương ứng */
    icon: string;
  }
> = {
  active: {
    label_vi: "Đang hiệu lực",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: "CheckCircle2",
  },
  expired: {
    label_vi: "Hết hạn",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    icon: "Clock",
  },
  terminated: {
    label_vi: "Đã chấm dứt",
    badgeColor: "bg-red-100 text-red-600 border-red-200",
    icon: "XCircle",
  },
  pending: {
    label_vi: "Chờ ký",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "FileSignature",
  },
};

/**
 * Cấu hình hiển thị theo loại hợp đồng.
 * Dùng trong: ContractForm Select, ContractTable, ContractCard.
 */
export const CONTRACT_TYPE_CONFIG: Record<
  ContractType,
  { label_vi: string; description: string }
> = {
  probation: {
    label_vi: "Thử việc",
    description: "Tối đa 60 ngày theo Bộ luật Lao động",
  },
  "fixed-term": {
    label_vi: "Có thời hạn",
    description: "Từ 1 tháng đến 36 tháng",
  },
  indefinite: {
    label_vi: "Không thời hạn",
    description: "Hợp đồng dài hạn, không có ngày kết thúc",
  },
};
