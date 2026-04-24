"use client";

// ============================================================================
// GK-HRMS — AccountForm
// Form tạo / sửa tài khoản — React Hook Form + Zod v4
// ============================================================================

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountStore } from "@/store/accountStore";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserAccount, UserRole } from "@/types/account";

// ---------------------------------------------------------------------------
// Zod Schema — local schema cho form (subset of accountFormSchema)
// ---------------------------------------------------------------------------

const accountFormLocalSchema = z.object({
  username: z
    .string({ error: "Tên đăng nhập là bắt buộc" })
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(50, "Tên đăng nhập không quá 50 ký tự")
    .regex(/^[a-zA-Z0-9._]+$/, "Tên đăng nhập chỉ chứa chữ, số, dấu chấm và gạch dưới"),
  email: z
    .string({ error: "Email là bắt buộc" })
    .email("Email không hợp lệ"),
  role: z.enum(["super_admin", "hr_admin", "branch_manager", "accountant", "director"] as const, {
    error: "Vui lòng chọn vai trò",
  }),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .optional()
    .or(z.literal("")),
});

type AccountFormValues = z.infer<typeof accountFormLocalSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AccountFormProps {
  initialData?: UserAccount;
  onSuccess?: () => void;
}

export function AccountForm({ initialData, onSuccess }: AccountFormProps) {
  const { createAccount, updateAccount, loading } = useAccountStore();
  const isEditing = !!initialData;

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormLocalSchema),
    defaultValues: initialData
      ? {
          username: initialData.username,
          email: initialData.email,
          role: initialData.role,
          password: "",
        }
      : {
          username: "",
          email: "",
          role: "accountant",
          password: "",
        },
  });

  const onSubmit = async (values: AccountFormValues) => {
    if (isEditing && initialData) {
      await updateAccount(initialData.id, {
        ...values,
        employeeId: initialData.employeeId,
        isActive: initialData.isActive,
        permissions: initialData.permissions,
        branchId: initialData.branchId,
      });
    } else {
      await createAccount({
        ...values,
        employeeId: null,
        isActive: true,
        permissions: [],
        branchId: null,
      });
    }
    onSuccess?.();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Tên đăng nhập *
        </label>
        <Input
          {...form.register("username")}
          placeholder="admin.giakhanh"
          disabled={isEditing}
        />
        {form.formState.errors.username && (
          <p className="mt-1 text-xs text-red-500">
            {form.formState.errors.username.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Email *
        </label>
        <Input
          {...form.register("email")}
          type="email"
          placeholder="email@giakhanh.vn"
        />
        {form.formState.errors.email && (
          <p className="mt-1 text-xs text-red-500">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Vai trò *
        </label>
        <Select
          value={form.watch("role")}
          onValueChange={(v) => form.setValue("role", v as UserRole)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.role && (
          <p className="mt-1 text-xs text-red-500">
            {form.formState.errors.role.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Mật khẩu {isEditing ? "(để trống nếu không đổi)" : "*"}
        </label>
        <Input
          {...form.register("password")}
          type="password"
          placeholder="••••••"
        />
        {form.formState.errors.password && (
          <p className="mt-1 text-xs text-red-500">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Đang lưu..."
            : isEditing
              ? "Cập nhật"
              : "Tạo tài khoản"}
        </Button>
      </div>
    </form>
  );
}
