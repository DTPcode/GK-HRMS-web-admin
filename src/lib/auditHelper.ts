// ============================================================================
// GK-HRMS — Audit Helper
// Centralized utility for audit logging — fire-and-forget pattern.
// Replaces boilerplate: import accountStore → import supplementStore → logAction
// ============================================================================

import type { AuditAction, AuditModule } from "@/types/supplement";

interface AuditParams {
  module: AuditModule;
  action: AuditAction;
  targetId: string;
  targetName: string;
  changes?: Record<string, { before: unknown; after: unknown }> | null;
}

/**
 * Ghi audit log — fire-and-forget.
 * Tự lấy currentUser từ accountStore, gửi POST /audit-logs qua supplementStore.
 *
 * @example
 * logAudit({
 *   module: "employees",
 *   action: "create",
 *   targetId: newEmployee.id,
 *   targetName: newEmployee.name,
 * });
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const { useAccountStore } = await import("@/store/accountStore");
    const { useSupplementStore } = await import("@/store/supplementStore");
    const currentUser = useAccountStore.getState().currentUser;
    if (!currentUser) return;

    await useSupplementStore.getState().logAction({
      userId: currentUser.id,
      userName: currentUser.username,
      action: params.action,
      module: params.module,
      targetId: params.targetId,
      targetName: params.targetName,
      changes: params.changes ?? null,
      ipAddress: "mock-ip",
    });
  } catch {
    // Silent fail — audit log không block business logic
  }
}
