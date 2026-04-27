"use client";

// ============================================================================
// GK-HRMS — DisciplineForm
// Form kỷ luật: dùng chung cho add + edit
// Mode: với employeeId prop (per-employee) hoặc không (global — hiện picker)
// ============================================================================

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  disciplineFormSchema,
  DISCIPLINE_TYPE_CONFIG,
} from "@/types/reward";
import type { DisciplineFormData, DisciplineType } from "@/types/reward";
import { useEmployeeStore } from "@/store/employeeStore";
import { useAccountStore } from "@/store/accountStore";
import { BRANCH_LIST } from "@/types/employee";
import { getInitials } from "@/lib/utils";

interface DisciplineFormProps {
  defaultValues?: Partial<DisciplineFormData>;
  onSubmit: (data: DisciplineFormData) => void | Promise<void>;
  isLoading?: boolean;
  /** Fixed employee — truyền khi ở employee detail page */
  employeeId?: string;
}

export function DisciplineForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  employeeId,
}: DisciplineFormProps) {
  const employees = useEmployeeStore((s) => s.employees);
  const currentUser = useAccountStore((s) => s.currentUser);
  const isBM = currentUser.role === "branch_manager";

  const [empSearch, setEmpSearch] = useState("");

  const filteredEmps = useMemo(() => {
    let list = employees.filter((e) => e.status === "active");
    if (isBM && currentUser.branchId)
      list = list.filter((e) => e.branchId === currentUser.branchId);
    if (empSearch)
      list = list.filter((e) =>
        e.name.toLowerCase().includes(empSearch.toLowerCase())
      );
    return list.slice(0, 20);
  }, [employees, isBM, currentUser.branchId, empSearch]);

  const form = useForm<DisciplineFormData>({
    resolver: zodResolver(disciplineFormSchema),
    defaultValues: {
      employeeId: employeeId ?? "",
      type: "warning",
      title: "",
      penaltyAmount: 0,
      reason: "",
      effectiveDate: new Date().toISOString().slice(0, 10),
      endDate: null,
      linkedPayrollMonth: null,
      ...defaultValues,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const selectedEmpId = watch("employeeId");

  const disciplineTypes = Object.entries(DISCIPLINE_TYPE_CONFIG) as [
    DisciplineType,
    (typeof DISCIPLINE_TYPE_CONFIG)[DisciplineType],
  ][];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Employee Picker */}
      {!employeeId && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nhân viên <span className="text-red-500">*</span>
          </label>
          <input type="hidden" {...register("employeeId")} />
          <Input
            placeholder="Tìm nhân viên..."
            value={empSearch}
            onChange={(e) => setEmpSearch(e.target.value)}
            className="mb-2 text-sm"
          />
          {!selectedEmpId && filteredEmps.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
              {filteredEmps.map((emp) => {
                const branchN = BRANCH_LIST.find(
                  (b) => b.id === emp.branchId
                )?.name.replace("Gia Khánh - ", "");
                return (
                  <button
                    key={emp.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-red-50"
                    onClick={() => {
                      setValue("employeeId", emp.id);
                      setEmpSearch(emp.name);
                    }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700">
                      {getInitials(emp.name)}
                    </div>
                    <span className="font-medium">{emp.name}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {emp.department} · {branchN}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {selectedEmpId && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm">
              <span className="font-medium text-red-700">
                {employees.find((e) => e.id === selectedEmpId)?.name}
              </span>
              <button
                type="button"
                className="ml-auto text-xs text-slate-400 hover:text-red-500"
                onClick={() => {
                  setValue("employeeId", "");
                  setEmpSearch("");
                }}
              >
                Đổi
              </button>
            </div>
          )}
          {errors.employeeId && (
            <p className="mt-1 text-xs text-red-500">
              {errors.employeeId.message}
            </p>
          )}
        </div>
      )}

      {employeeId && <input type="hidden" {...register("employeeId")} />}

      {/* Hình thức kỷ luật */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Hình thức kỷ luật <span className="text-red-500">*</span>
        </label>
        <select
          {...register("type")}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {disciplineTypes.map(([value, config]) => (
            <option key={value} value={value}>
              {config.label_vi}
            </option>
          ))}
        </select>
      </div>

      {/* Tên hình thức */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Tên hình thức <span className="text-red-500">*</span>
        </label>
        <Input
          {...register("title")}
          placeholder="VD: Vi phạm nội quy lần 2"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Tiền phạt */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Tiền phạt (VND)
        </label>
        <Input
          type="number"
          min={0}
          {...register("penaltyAmount", { valueAsNumber: true })}
          placeholder="0"
        />
        <p className="mt-1 text-xs text-slate-400">
          Nhập 0 nếu kỷ luật không kèm phạt tiền
        </p>
      </div>

      {/* Lý do */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Lý do <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register("reason")}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Mô tả chi tiết lý do kỷ luật (tối thiểu 10 ký tự)"
        />
        {errors.reason && (
          <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>
        )}
      </div>

      {/* Ngày hiệu lực */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Ngày hiệu lực <span className="text-red-500">*</span>
        </label>
        <Input type="date" {...register("effectiveDate")} />
      </div>

      {/* Ngày kết thúc */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Ngày kết thúc
        </label>
        <Input type="date" {...register("endDate")} />
        <p className="mt-1 text-xs text-slate-400">
          Bỏ trống = vô thời hạn (VD: sa thải)
        </p>
      </div>

      {/* Link bảng lương */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Liên kết bảng lương tháng
        </label>
        <Input type="month" {...register("linkedPayrollMonth")} />
        <p className="mt-1 text-xs text-slate-400">
          Tiền phạt sẽ tự động trừ vào bảng lương tháng này
        </p>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? "Cập nhật" : "Thêm kỷ luật"}
        </Button>
      </div>
    </form>
  );
}
