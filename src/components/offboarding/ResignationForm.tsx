"use client";

// ============================================================================
// GK-HRMS — ResignationForm
// Form tạo đơn nghỉ việc mới
// Validation: lastWorkingDate >= submittedDate + 30 ngày
// ============================================================================

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEmployeeStore } from "@/store/employeeStore";
import { RESIGNATION_TYPE_CONFIG } from "@/types/offboarding";
import type { ResignationType } from "@/types/offboarding";

// ---------------------------------------------------------------------------
// Schema với custom validation lastWorkingDate
// ---------------------------------------------------------------------------

const resignationInputSchema = z
  .object({
    employeeId: z.string({ error: "Nhân viên là bắt buộc" }).min(1, "Vui lòng chọn nhân viên"),
    type: z.enum(["voluntary", "terminated", "retired", "contract_end"], {
      error: "Loại nghỉ việc là bắt buộc",
    }),
    submittedDate: z
      .string({ error: "Ngày nộp đơn là bắt buộc" })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),
    lastWorkingDate: z
      .string({ error: "Ngày làm việc cuối cùng là bắt buộc" })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD"),
    reason: z
      .string({ error: "Lý do nghỉ việc là bắt buộc" })
      .min(10, "Lý do nghỉ việc phải có ít nhất 10 ký tự"),
    handoverNote: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      const submitted = new Date(data.submittedDate);
      const lastWork = new Date(data.lastWorkingDate);
      const minDate = new Date(submitted);
      minDate.setDate(minDate.getDate() + 30);
      return lastWork >= minDate;
    },
    {
      message: "Ngày làm việc cuối cùng phải sau ngày nộp đơn ít nhất 30 ngày",
      path: ["lastWorkingDate"],
    }
  );

type ResignationInputData = z.infer<typeof resignationInputSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResignationFormProps {
  onSubmit: (data: ResignationInputData) => void | Promise<void>;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResignationForm({ onSubmit, isLoading = false }: ResignationFormProps) {
  const employees = useEmployeeStore((s) => s.employees);
  const activeEmployees = employees.filter((e) => e.status === "active");

  const today = new Date().toISOString().slice(0, 10);
  const min30 = new Date();
  min30.setDate(min30.getDate() + 30);
  const defaultLastDate = min30.toISOString().slice(0, 10);

  const form = useForm<ResignationInputData>({
    resolver: zodResolver(resignationInputSchema),
    defaultValues: {
      employeeId: "",
      type: "voluntary",
      submittedDate: today,
      lastWorkingDate: defaultLastDate,
      reason: "",
      handoverNote: "",
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  // Watch submittedDate cho dynamic min lastWorkingDate
  const watchedSubmitted = useWatch({ control, name: "submittedDate" });

  const resignationTypes = Object.entries(RESIGNATION_TYPE_CONFIG) as [
    ResignationType,
    (typeof RESIGNATION_TYPE_CONFIG)[ResignationType],
  ][];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Nhân viên */}
      <div>
        <label
          htmlFor="resign-employee"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Nhân viên <span className="text-red-500">*</span>
        </label>
        <select
          id="resign-employee"
          {...register("employeeId")}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">-- Chọn nhân viên --</option>
          {activeEmployees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} — {emp.department} ({emp.id})
            </option>
          ))}
        </select>
        {errors.employeeId && (
          <p className="mt-1 text-xs text-red-500">{errors.employeeId.message}</p>
        )}
      </div>

      {/* Loại nghỉ việc */}
      <div>
        <label
          htmlFor="resign-type"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Loại nghỉ việc <span className="text-red-500">*</span>
        </label>
        <select
          id="resign-type"
          {...register("type")}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {resignationTypes.map(([value, config]) => (
            <option key={value} value={value}>
              {config.label_vi}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>
        )}
      </div>

      {/* Ngày nộp đơn */}
      <div>
        <label
          htmlFor="resign-submitted"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Ngày nộp đơn <span className="text-red-500">*</span>
        </label>
        <Input id="resign-submitted" type="date" {...register("submittedDate")} />
        {errors.submittedDate && (
          <p className="mt-1 text-xs text-red-500">{errors.submittedDate.message}</p>
        )}
      </div>

      {/* Ngày làm việc cuối cùng */}
      <div>
        <label
          htmlFor="resign-last-date"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Ngày làm việc cuối cùng <span className="text-red-500">*</span>
        </label>
        <Input
          id="resign-last-date"
          type="date"
          min={watchedSubmitted ?? today}
          {...register("lastWorkingDate")}
        />
        {errors.lastWorkingDate && (
          <p className="mt-1 text-xs text-red-500">{errors.lastWorkingDate.message}</p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          Theo luật, phải báo trước ít nhất 30 ngày
        </p>
      </div>

      {/* Lý do */}
      <div>
        <label
          htmlFor="resign-reason"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Lý do nghỉ việc <span className="text-red-500">*</span>
        </label>
        <textarea
          id="resign-reason"
          {...register("reason")}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Mô tả lý do nghỉ việc (tối thiểu 10 ký tự)"
        />
        {errors.reason && (
          <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Nộp đơn nghỉ việc
        </Button>
      </div>
    </form>
  );
}
