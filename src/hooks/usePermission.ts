"use client";

// ============================================================================
// GK-HRMS — usePermission Hook
// Check quyền RBAC của current user trên 1 module + action cụ thể.
// Đọc từ accountStore (reactive) → re-render khi switchRole().
// TODO: Replace với real JWT + API permission check khi backend sẵn
// ============================================================================

import { useAccountStore } from "@/store/accountStore";
import type { Module, Action } from "@/types/account";

/**
 * Map module name từ consumer → tên module trong ROLE_PERMISSIONS (số nhiều).
 * Consumer gọi usePermission("employee", "create") → tra ROLE_PERMISSIONS["employees"].
 *
 * Tại sao cần map: consumer dùng singular ("employee") cho ngắn gọn,
 * nhưng ROLE_PERMISSIONS key dùng plural ("employees") theo convention REST.
 */
const MODULE_ALIAS: Record<string, Module> = {
  employee: "employees",
  contract: "contracts",
  attendance: "attendance",
  payroll: "payroll",
  account: "accounts",
  report: "reports",
};

/**
 * Kiểm tra user hiện tại có quyền thực hiện action trên module không.
 *
 * Tại sao dùng accountStore thay vì getCurrentMockUser():
 *   - accountStore.currentUser là reactive → khi switchRole() thì UI re-render
 *   - getCurrentMockUser() đọc localStorage trực tiếp → không trigger re-render
 *
 * @param module - Tên module: "employee" | "contract" | "attendance" | "payroll" | "account" | "report"
 * @param action - Hành động: "view" | "create" | "update" | "delete" | "approve" | "export"
 * @returns true nếu có quyền
 *
 * @example
 * const canCreate = usePermission("employee", "create");
 * if (!canCreate) return <p>Bạn không có quyền tạo nhân viên</p>;
 */
export function usePermission(module: string, action: string): boolean {
  // Dùng selector → chỉ re-render khi hasPermission ref thay đổi
  const hasPermission = useAccountStore((s) => s.hasPermission);

  // Normalize: "employee" → "employees"
  const normalizedModule = MODULE_ALIAS[module] ?? (module as Module);

  return hasPermission(normalizedModule, action as Action);
}
