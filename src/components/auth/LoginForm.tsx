"use client";

// ============================================================================
// GK-HRMS — LoginForm
// Form đăng nhập: username + password, Zod validation, mock auth
// Mock phase: check credentials với MOCK_CREDENTIALS
// TODO: Replace với real API auth khi backend sẵn
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, LogIn, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_USERS, setMockRole } from "@/lib/mockAuth";
import { useAccountStore } from "@/store/accountStore";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Mock credentials — map username → password
// ---------------------------------------------------------------------------

const MOCK_CREDENTIALS: Record<string, string> = {
  admin: "admin123",
  "hr.admin": "hr123",
  "branch.q1": "branch123",
  ketoan: "acc123",
  giamdoc: "dir123",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Check credentials
    const expectedPassword = MOCK_CREDENTIALS[values.username];
    if (!expectedPassword || expectedPassword !== values.password) {
      toast.error("Tên đăng nhập hoặc mật khẩu không đúng");
      setIsSubmitting(false);
      return;
    }

    // Find mock user
    const user = MOCK_USERS.find((u) => u.username === values.username);
    if (!user) {
      toast.error("Tài khoản không tồn tại trong hệ thống");
      setIsSubmitting(false);
      return;
    }

    // Save to store + localStorage
    setMockRole(user.role);
    useAccountStore.getState().switchRole(user.role);

    // Set cookie for middleware (mock — no real auth)
    document.cookie = `mock_current_role=${user.role}; path=/; max-age=${60 * 60 * 24 * 30}`;

    toast.success(`Đăng nhập thành công — ${user.role}`, {
      description: `Xin chào, ${user.username}!`,
    });

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* ── Logo Card ── */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">GK-HRMS</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hệ thống Quản lý Nhân sự — Lẩu Nấm Gia Khánh
          </p>
        </div>

        {/* ── Login Card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
          <h2 className="mb-6 text-lg font-semibold text-slate-800">
            Đăng nhập
          </h2>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="login-username"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Tên đăng nhập
              </label>
              <Input
                id="login-username"
                {...form.register("username")}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                disabled={isSubmitting}
              />
              {form.formState.errors.username && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  {...form.register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full gap-2"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Đăng nhập
                </>
              )}
            </Button>
          </form>
        </div>

        {/* ── Mock Credentials (dev helper) ── */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
            Tài khoản test
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(MOCK_CREDENTIALS).map(([username, password]) => {
              const user = MOCK_USERS.find((u) => u.username === username);
              return (
                <button
                  key={username}
                  type="button"
                  onClick={() => {
                    form.setValue("username", username);
                    form.setValue("password", password);
                  }}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left transition-colors hover:border-blue-200 hover:bg-blue-50"
                >
                  <div>
                    <p className="font-medium text-slate-700">{username}</p>
                    <p className="text-slate-400">{password}</p>
                  </div>
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    {user?.role.replace("_", " ") ?? ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
