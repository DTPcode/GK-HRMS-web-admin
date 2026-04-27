"use client";

// ============================================================================
// GK-HRMS — InsuranceForm
// Form khai báo / cập nhật bảo hiểm NV
// Realtime preview NLĐ/NSDLĐ đóng khi thay đổi insuredSalary
// ============================================================================

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Calculator } from "lucide-react";
import { useInsuranceStore } from "@/store/insuranceStore";
import { INSURANCE_RATE_CONFIG } from "@/types/insurance";

// ---------------------------------------------------------------------------
// Form schema — tối giản cho UI (chỉ insuredSalary, startDate, note)
// Rates mặc định theo luật — HR không cần nhập tay
// ---------------------------------------------------------------------------

const insuranceInputSchema = z.object({
  insuredSalary: z
    .number({ error: "Mức lương đóng BH là bắt buộc" })
    .min(0, "Mức lương không được âm")
    .max(500_000_000, "Mức lương tối đa 500 triệu"),
  startDate: z
    .string({ error: "Ngày bắt đầu là bắt buộc" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),
  note: z.string().max(500, "Ghi chú tối đa 500 ký tự").optional(),
});

type InsuranceInputData = z.infer<typeof insuranceInputSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InsuranceFormProps {
  defaultValues?: Partial<InsuranceInputData>;
  onSubmit: (data: InsuranceInputData) => void | Promise<void>;
  isLoading?: boolean;
  /** true = cập nhật, false = tạo mới */
  isEdit?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InsuranceForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  isEdit = false,
}: InsuranceFormProps) {
  const calculateContributions = useInsuranceStore(
    (s) => s.calculateContributions
  );

  const form = useForm<InsuranceInputData>({
    resolver: zodResolver(insuranceInputSchema),
    defaultValues: {
      insuredSalary: 0,
      startDate: new Date().toISOString().slice(0, 10),
      note: "",
      ...defaultValues,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  // Realtime preview — watch insuredSalary
  const watchedSalary = useWatch({ control, name: "insuredSalary" });
  const salary = typeof watchedSalary === "number" && watchedSalary > 0 ? watchedSalary : 0;
  const preview = calculateContributions(salary);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Mức lương đóng BH */}
      <div>
        <label
          htmlFor="ins-salary"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Mức lương đóng bảo hiểm (VND) <span className="text-red-500">*</span>
        </label>
        <Input
          id="ins-salary"
          type="number"
          min={0}
          max={500_000_000}
          step={100_000}
          {...register("insuredSalary", { valueAsNumber: true })}
          placeholder="VD: 8000000"
        />
        {errors.insuredSalary && (
          <p className="mt-1 text-xs text-red-500">
            {errors.insuredSalary.message}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          Mức lương đóng bảo hiểm (có thể khác lương hợp đồng)
        </p>
      </div>

      {/* Realtime Preview */}
      {salary > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              Ước tính đóng hàng tháng
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500">NLĐ sẽ đóng</p>
              <p className="font-bold text-emerald-600">
                {formatVND(preview.employeeContribution)}
              </p>
              <p className="text-xs text-slate-400">
                BHXH {(INSURANCE_RATE_CONFIG.bhxh.employee * 100).toFixed(0)}% +
                BHYT {(INSURANCE_RATE_CONFIG.bhyt.employee * 100).toFixed(1)}% +
                BHTN {(INSURANCE_RATE_CONFIG.bhtn.employee * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-slate-500">Công ty sẽ đóng</p>
              <p className="font-bold text-violet-600">
                {formatVND(preview.employerContribution)}
              </p>
              <p className="text-xs text-slate-400">
                BHXH {(INSURANCE_RATE_CONFIG.bhxh.employer * 100).toFixed(1)}% +
                BHYT {(INSURANCE_RATE_CONFIG.bhyt.employer * 100).toFixed(0)}% +
                BHTN {(INSURANCE_RATE_CONFIG.bhtn.employer * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ngày bắt đầu */}
      <div>
        <label
          htmlFor="ins-start"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Ngày bắt đầu đóng BH <span className="text-red-500">*</span>
        </label>
        <Input id="ins-start" type="date" {...register("startDate")} />
        {errors.startDate && (
          <p className="mt-1 text-xs text-red-500">
            {errors.startDate.message}
          </p>
        )}
      </div>

      {/* Ghi chú */}
      <div>
        <label
          htmlFor="ins-note"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Ghi chú
        </label>
        <textarea
          id="ins-note"
          {...register("note")}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Ghi chú nếu có (tùy chọn)"
        />
        {errors.note && (
          <p className="mt-1 text-xs text-red-500">{errors.note.message}</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Cập nhật bảo hiểm" : "Khai báo bảo hiểm"}
        </Button>
      </div>
    </form>
  );
}
