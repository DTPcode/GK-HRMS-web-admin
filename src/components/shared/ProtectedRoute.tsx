"use client";

// ============================================================================
// GK-HRMS — ProtectedRoute
// Wrapper kiểm tra quyền trước khi render children.
// Nếu không có quyền → redirect /dashboard + toast cảnh báo.
// TODO: Replace với real auth guard (middleware.ts + JWT) khi backend sẵn
// ============================================================================

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

interface ProtectedRouteProps {
  /** Module cần kiểm tra quyền */
  module: string;
  /** Hành động cần kiểm tra: "view" | "create" | "update" | "delete" | "approve" */
  action: string;
  /** Nội dung hiển thị nếu có quyền */
  children: ReactNode;
  /**
   * Fallback khi không có quyền.
   * - Truyền ReactNode → render inline (không redirect)
   * - Không truyền → redirect về /dashboard
   */
  fallback?: ReactNode;
}

/**
 * Route guard dựa trên RBAC.
 *
 * @example
 * // Redirect nếu không có quyền
 * <ProtectedRoute module="employees" action="view">
 *   <EmployeePageClient />
 * </ProtectedRoute>
 *
 * @example
 * // Render custom fallback
 * <ProtectedRoute module="accounts" action="create" fallback={<NoAccess />}>
 *   <AccountForm />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  module,
  action,
  children,
  fallback,
}: ProtectedRouteProps) {
  const hasAccess = usePermission(module, action);
  const router = useRouter();
  const toastShown = useRef(false);

  // Redirect về /dashboard + toast nếu không có quyền và không có fallback
  useEffect(() => {
    if (!hasAccess && !fallback && !toastShown.current) {
      toastShown.current = true;
      toast.error("Bạn không có quyền truy cập", {
        description: "Liên hệ quản trị viên để được cấp quyền.",
        duration: 3000,
      });
      router.replace("/dashboard");
    }
  }, [hasAccess, fallback, router]);

  if (!hasAccess) {
    // Có custom fallback → render inline
    if (fallback) return <>{fallback}</>;

    // Không có fallback → hiện loading tạm trong khi redirect
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">
          Không có quyền truy cập
        </h2>
        <p className="text-sm text-slate-500">
          Đang chuyển hướng về trang chính...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
