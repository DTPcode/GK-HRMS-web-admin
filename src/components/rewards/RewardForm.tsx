"use client";

// ============================================================================
// GK-HRMS — RewardForm
// Form khen thưởng: dùng chung cho add + edit
// Mode: với employeeId prop (per-employee) hoặc không (global — hiện picker)
// ============================================================================

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  rewardFormSchema,
  REWARD_TYPE_CONFIG,
} from "@/types/reward";
import type { RewardFormData, RewardType } from "@/types/reward";
import { useEmployeeStore } from "@/store/employeeStore";
import { useAccountStore } from "@/store/accountStore";
import { BRANCH_LIST } from "@/types/employee";
import { getInitials } from "@/lib/utils";

interface RewardFormProps {
  defaultValues?: Partial<RewardFormData>;
  onSubmit: (data: RewardFormData) => void | Promise<void>;
  isLoading?: boolean;
  /** Fixed employee — truyền khi ở employee detail page */
  employeeId?: string;
}

export function RewardForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  employeeId,
}: RewardFormProps) {
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

  const form = useForm<RewardFormData>({
    resolver: zodResolver(rewardFormSchema),
    defaultValues: {
      employeeId: employeeId ?? "",
      type: "bonus",
      title: "",
      amount: 0,
      reason: "",
      effectiveDate: new Date().toISOString().slice(0, 10),
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

  const rewardTypes = Object.entries(REWARD_TYPE_CONFIG) as [
    RewardType,
    (typeof REWARD_TYPE_CONFIG)[RewardType],
  ][];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Employee Picker — chỉ hiện khi không truyền employeeId */}
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
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                    onClick={() => {
                      setValue("employeeId", emp.id);
                      setEmpSearch(emp.name);
                    }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
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
            <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm">
              <span className="font-medium text-blue-700">
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

      {/* Loại khen thưởng */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Loại khen thưởng <span className="text-red-500">*</span>
        </label>
        <select
          {...register("type")}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {rewardTypes.map(([value, config]) => (
            <option key={value} value={value}>
              {config.label_vi}
            </option>
          ))}
        </select>
      </div>

      {/* Tên danh hiệu */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Tên danh hiệu <span className="text-red-500">*</span>
        </label>
        <Input
          {...register("title")}
          placeholder="VD: Thưởng hoàn thành KPI tháng 3"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Tiền thưởng */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Tiền thưởng (VND)
        </label>
        <Input
          type="number"
          min={0}
          {...register("amount", { valueAsNumber: true })}
          placeholder="0"
        />
        <p className="mt-1 text-xs text-slate-400">
          Nhập 0 nếu khen thưởng không kèm tiền
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
          placeholder="Mô tả chi tiết lý do khen thưởng (tối thiểu 10 ký tự)"
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

      {/* Link bảng lương */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Liên kết bảng lương tháng
        </label>
        <Input type="month" {...register("linkedPayrollMonth")} />
        <p className="mt-1 text-xs text-slate-400">
          Tiền thưởng sẽ tự động cộng vào bảng lương tháng này
        </p>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? "Cập nhật" : "Thêm khen thưởng"}
        </Button>
      </div>
    </form>
  );
}
