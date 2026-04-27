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
 * Tại sao subscribe role + branchId thay vì hasPermission function:
 *   - hasPermission là function reference → thay đổi mỗi render → infinite re-render
 *   - Subscribe primitive values (role, branchId) → chỉ re-render khi thực sự thay đổi
 *   - Gọi hasPermission qua getState() → không subscribe, chỉ read-once
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
  // Subscribe primitive values → re-render chỉ khi role/branchId thay đổi
  const role = useAccountStore((s) => s.currentUser?.role);
  const permissions = useAccountStore((s) => s.currentUser?.permissions);

  // Normalize: "employee" → "employees"
  const normalizedModule = MODULE_ALIAS[module] ?? (module as Module);

  // Dùng getState() để gọi hasPermission mà không subscribe function reference
  return useAccountStore.getState().hasPermission(normalizedModule, action as Action);
}

