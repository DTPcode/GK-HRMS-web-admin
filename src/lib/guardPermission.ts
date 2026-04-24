// ============================================================================
// GK-HRMS — Store Permission Guard
// Kiểm tra quyền TRƯỚC khi thực hiện action trong store.
// Nếu không có quyền → set error + return false (action bị chặn).
// Dùng tại tầng store để đảm bảo không ai bypass UI gọi thẳng store action.
// ============================================================================

import type { Module, Action } from "@/types/account";

/**
 * Kiểm tra quyền hiện tại và trả về true/false.
 * Nếu không có quyền → gọi setError callback với message mô tả.
 *
 * @param module - Tên module: "employees" | "contracts" | "attendance" | "payroll" | "accounts"
 * @param action - Hành động: "view" | "create" | "update" | "delete" | "approve" | "export"
 * @param setError - Callback set error state của store
 * @returns true nếu có quyền, false nếu bị chặn
 *
 * @example
 * // Trong store action:
 * if (!guardPermission("employees", "create", (msg) => set({ error: msg }))) return;
 */
export function guardPermission(
  module: Module,
  action: Action,
  setError: (message: string) => void
): boolean {
  // Dynamic import tránh circular dependency
  // accountStore là source-of-truth cho currentUser + hasPermission
  const { useAccountStore } = require("@/store/accountStore");
  const { hasPermission } = useAccountStore.getState();

  if (!hasPermission(module, action)) {
    const ACTION_LABELS: Record<string, string> = {
      view: "xem",
      create: "tạo mới",
      update: "chỉnh sửa",
      delete: "xóa",
      approve: "duyệt",
      export: "xuất dữ liệu",
    };
    const MODULE_LABELS: Record<string, string> = {
      employees: "nhân viên",
      contracts: "hợp đồng",
      attendance: "chấm công",
      payroll: "bảng lương",
      accounts: "tài khoản",
      reports: "báo cáo",
    };

    const actionLabel = ACTION_LABELS[action] ?? action;
    const moduleLabel = MODULE_LABELS[module] ?? module;

    setError(
      `Bạn không có quyền ${actionLabel} ${moduleLabel}. Liên hệ quản trị viên để được cấp quyền.`
    );
    return false;
  }

  return true;
}
