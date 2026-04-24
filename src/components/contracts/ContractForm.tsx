"use client";

// ============================================================================
// GK-HRMS — ContractForm
// Form tạo / sửa hợp đồng — React Hook Form + Zod
// Business rule: validate không có 2 contract active cùng NV
// endDate disabled khi type = "indefinite"
// ============================================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  contractFormSchema,
  CONTRACT_TYPE_CONFIG,
  CONTRACT_STATUS_CONFIG,
} from "@/types/contract";
import type { Contract, ContractFormData } from "@/types/contract";
import { useEmployeeStore } from "@/store/employeeStore";
import { useContractStore } from "@/store/contractStore";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContractFormProps {
  defaultValues?: Partial<Contract>;
  onSubmit: (data: ContractFormData) => Promise<void>;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractForm({
  defaultValues,
  onSubmit,
  isLoading = false,
}: ContractFormProps) {
  const router = useRouter();
  const isEditing = !!defaultValues?.id;

  // Lấy danh sách NV để hiển thị Select
  const { employees, fetchEmployees } = useEmployeeStore();
  // Lấy contracts để check business rule
  const contracts = useContractStore((s) => s.contracts);

  useEffect(() => {
    if (employees.length === 0) fetchEmployees();
  }, [employees.length, fetchEmployees]);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      employeeId: defaultValues?.employeeId ?? "",
      type: defaultValues?.type ?? ("probation" as ContractFormData["type"]),
      startDate: defaultValues?.startDate ?? "",
      endDate: defaultValues?.endDate ?? null,
      baseSalary: defaultValues?.baseSalary ?? 0,
      allowances: defaultValues?.allowances ?? 0,
      status: defaultValues?.status ?? "active",
      documentUrl: defaultValues?.documentUrl ?? undefined,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = form;

  const watchType = watch("type");
  const watchEmployeeId = watch("employeeId");
  const watchStatus = watch("status");

  // Khi type = "indefinite" → clear endDate
  useEffect(() => {
    if (watchType === "indefinite") {
      setValue("endDate", null);
    }
  }, [watchType, setValue]);

  // Error ring helper
  const errorRing = (field: keyof ContractFormData) =>
    errors[field] ? "ring-2 ring-red-500/40 border-red-400" : "";

  // Custom validate handler wrapping onSubmit
  const handleFormSubmit = async (data: ContractFormData) => {
    // Business rule: không có 2 contract active cùng NV
    if (data.status === "active") {
      const existingActive = contracts.find(
        (c) =>
          c.employeeId === data.employeeId &&
          c.status === "active" &&
          c.id !== defaultValues?.id // exclude current when editing
      );
      if (existingActive) {
        setError("employeeId", {
          message:
            "Nhân viên này đã có hợp đồng đang hiệu lực. Vui lòng kết thúc hợp đồng cũ trước.",
        });
        return;
      }
    }
    await onSubmit(data);
  };

  // Filter employees active cho Select
  const activeEmployees = employees.filter(
    (e) => e.status === "active" || e.id === defaultValues?.employeeId
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* ═══ Section 1: Thông tin hợp đồng ═══ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          Thông tin hợp đồng
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Employee Select — search */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nhân viên <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => field.onChange(v)}
                  disabled={isLoading || isEditing}
                >
                  <SelectTrigger
                    id="employeeId"
                    className={`w-full ${errorRing("employeeId")}`}
                  >
                    <SelectValue placeholder="Chọn nhân viên" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} — {emp.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.employeeId && (
              <p className="mt-1 text-xs text-red-500">
                {errors.employeeId.message}
              </p>
            )}
          </div>

          {/* Type Select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Loại hợp đồng <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id="contractType"
                    className={`w-full ${errorRing("type")}`}
                  >
                    <SelectValue placeholder="Chọn loại hợp đồng" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTRACT_TYPE_CONFIG).map(
                      ([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.label_vi}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="mt-1 text-xs text-red-500">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Status Select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Trạng thái <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id="contractStatus"
                    className={`w-full ${errorRing("status")}`}
                  >
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTRACT_STATUS_CONFIG).map(
                      ([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.label_vi}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && (
              <p className="mt-1 text-xs text-red-500">
                {errors.status.message}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label
              htmlFor="startDate"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Ngày bắt đầu <span className="text-red-500">*</span>
            </label>
            <Input
              id="startDate"
              {...register("startDate")}
              type="date"
              disabled={isLoading}
              className={errorRing("startDate")}
            />
            {errors.startDate && (
              <p className="mt-1 text-xs text-red-500">
                {errors.startDate.message}
              </p>
            )}
          </div>

          {/* End Date — disabled khi indefinite */}
          <div>
            <label
              htmlFor="endDate"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Ngày kết thúc{" "}
              {watchType !== "indefinite" && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <Input
              id="endDate"
              {...register("endDate")}
              type="date"
              disabled={isLoading || watchType === "indefinite"}
              className={errorRing("endDate")}
              placeholder={
                watchType === "indefinite"
                  ? "Không áp dụng"
                  : "Chọn ngày kết thúc"
              }
            />
            {watchType === "indefinite" && (
              <p className="mt-1 text-xs text-slate-400">
                Hợp đồng không thời hạn — không cần ngày kết thúc
              </p>
            )}
            {errors.endDate && (
              <p className="mt-1 text-xs text-red-500">
                {errors.endDate.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Section 2: Lương & Phụ cấp ═══ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          Lương & Phụ cấp
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Base Salary */}
          <div>
            <label
              htmlFor="baseSalary"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Mức lương theo hợp đồng (VND) <span className="text-red-500">*</span>
            </label>
            <Input
              id="baseSalary"
              {...register("baseSalary", { valueAsNumber: true })}
              type="number"
              placeholder="8000000"
              disabled={isLoading}
              className={errorRing("baseSalary")}
            />
            {errors.baseSalary ? (
              <p className="mt-1 text-xs text-red-500">
                {errors.baseSalary.message}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                Lương cơ bản của nhân viên sẽ được lấy từ hợp đồng hiệu lực
              </p>
            )}
          </div>

          {/* Allowances */}
          <div>
            <label
              htmlFor="allowances"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Tổng phụ cấp (VND) <span className="text-red-500">*</span>
            </label>
            <Input
              id="allowances"
              {...register("allowances", { valueAsNumber: true })}
              type="number"
              placeholder="1500000"
              disabled={isLoading}
              className={errorRing("allowances")}
            />
            {errors.allowances && (
              <p className="mt-1 text-xs text-red-500">
                {errors.allowances.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Section 3: Tài liệu ═══ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          Tài liệu đính kèm
          <span className="ml-2 text-sm font-normal text-slate-400">
            (không bắt buộc)
          </span>
        </h3>
        <div>
          <label
            htmlFor="documentUrl"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            URL file scan hợp đồng
          </label>
          <Input
            id="documentUrl"
            {...register("documentUrl")}
            placeholder="URL file scan hợp đồng (MinIO)"
            disabled={isLoading}
            className={errorRing("documentUrl")}
          />
          {errors.documentUrl && (
            <p className="mt-1 text-xs text-red-500">
              {errors.documentUrl.message}
            </p>
          )}
        </div>
      </div>

      {/* ═══ Button Row ═══ */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => router.push("/contracts")}
        >
          Hủy
        </Button>
        <Button type="submit" disabled={isLoading} className="min-w-[140px]">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang lưu...
            </>
          ) : isEditing ? (
            "Cập nhật"
          ) : (
            "Tạo hợp đồng"
          )}
        </Button>
      </div>
    </form>
  );
}
