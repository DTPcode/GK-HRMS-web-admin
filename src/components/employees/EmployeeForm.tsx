"use client";

// ============================================================================
// GK-HRMS — EmployeeForm
// Form tạo / sửa nhân viên — React Hook Form + Zod + base-ui Select/Tooltip
// Chia 3 sections: Thông tin cơ bản | Công việc | Bổ sung
// CONSTRAINT: component thuần UI — nhận props, không gọi store
// ============================================================================

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Loader2 } from "lucide-react";
import Link from "next/link";
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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  employeeFormSchema,
  DEPARTMENT_LIST,
  BRANCH_LIST,
  STATUS_CONFIG,
} from "@/types/employee";
import type { Employee, EmployeeFormData } from "@/types/employee";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EmployeeFormProps {
  /** Có = edit mode, không = create mode */
  defaultValues?: Partial<Employee>;
  /** Submit handler — gọi store action bên ngoài */
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  /** Đang submit? */
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmployeeForm({
  defaultValues,
  onSubmit,
  isLoading = false,
}: EmployeeFormProps) {
  const router = useRouter();
  const isEditing = !!defaultValues?.id;

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      nationalId: defaultValues?.nationalId ?? "",
      department:
        defaultValues?.department ??
        (undefined as unknown as EmployeeFormData["department"]),
      position: defaultValues?.position ?? "",
      branchId: defaultValues?.branchId ?? "",
      startDate: defaultValues?.startDate ?? "",
      status: defaultValues?.status ?? "active",
      avatarUrl: defaultValues?.avatarUrl ?? "",
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  // Helper: error ring class
  const errorRing = (field: keyof EmployeeFormData) =>
    errors[field] ? "ring-2 ring-red-500/40 border-red-400" : "";

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ═══ Section 1: Thông tin cơ bản ═══ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          Thông tin cơ bản
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Nguyễn Văn A"
              disabled={isLoading}
              className={errorRing("name")}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="0901234567"
              disabled={isLoading}
              className={errorRing("phone")}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              {...register("email")}
              type="email"
              placeholder="email@giakhanh.vn"
              disabled={isLoading}
              className={errorRing("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* National ID — sensitive field */}
          <div>
            <label
              htmlFor="nationalId"
              className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"
            >
              Số CCCD <span className="text-red-500">*</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    className="inline-flex text-slate-400 hover:text-slate-600"
                    aria-label="Thông tin bảo mật"
                  >
                    <Lock className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Thông tin bảo mật — không hiển thị ngoài chi tiết
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <Input
              id="nationalId"
              {...register("nationalId")}
              placeholder="012345678901"
              disabled={isLoading}
              className={errorRing("nationalId")}
            />
            {errors.nationalId && (
              <p className="mt-1 text-xs text-red-500">
                {errors.nationalId.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Section 2: Công việc ═══ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          Thông tin công việc
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Department — Select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Phòng ban <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="department"
              render={({ field }) => (
                <Select
                  value={field.value ?? undefined}
                  onValueChange={(v) => field.onChange(v)}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id="department"
                    className={`w-full ${errorRing("department")}`}
                  >
                    <SelectValue placeholder="Chọn phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_LIST.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.department && (
              <p className="mt-1 text-xs text-red-500">
                {errors.department.message}
              </p>
            )}
          </div>

          {/* Position — Input */}
          <div>
            <label
              htmlFor="position"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Chức danh <span className="text-red-500">*</span>
            </label>
            <Input
              id="position"
              {...register("position")}
              placeholder="Nhân viên phục vụ"
              disabled={isLoading}
              className={errorRing("position")}
            />
            {errors.position && (
              <p className="mt-1 text-xs text-red-500">
                {errors.position.message}
              </p>
            )}
          </div>

          {/* Branch — Select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Chi nhánh <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="branchId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => field.onChange(v)}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id="branchId"
                    className={`w-full ${errorRing("branchId")}`}
                  >
                    <SelectValue placeholder="Chọn chi nhánh" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCH_LIST.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.branchId && (
              <p className="mt-1 text-xs text-red-500">
                {errors.branchId.message}
              </p>
            )}
          </div>

          {/* Status — Select */}
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
                    id="status"
                    className={`w-full ${errorRing("status")}`}
                  >
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label_vi}
                      </SelectItem>
                    ))}
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

          {/* Start Date — max = today */}
          <div className="sm:col-span-2 sm:w-1/2">
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
              max={today}
              disabled={isLoading}
              className={errorRing("startDate")}
            />
            {errors.startDate && (
              <p className="mt-1 text-xs text-red-500">
                {errors.startDate.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Section 3: Thông tin bổ sung ═══ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          Thông tin bổ sung
          <span className="ml-2 text-sm font-normal text-slate-400">
            (không bắt buộc)
          </span>
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Avatar URL */}
          <div className="sm:col-span-2">
            <label
              htmlFor="avatarUrl"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              URL ảnh đại diện
            </label>
            <Input
              id="avatarUrl"
              {...register("avatarUrl")}
              placeholder="https://example.com/avatar.jpg"
              disabled={isLoading}
              className={errorRing("avatarUrl")}
            />
            {errors.avatarUrl && (
              <p className="mt-1 text-xs text-red-500">
                {errors.avatarUrl.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Button Row ═══ */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => router.push("/employees")}
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
            "Lưu nhân viên"
          )}
        </Button>
      </div>
    </form>
  );
}
