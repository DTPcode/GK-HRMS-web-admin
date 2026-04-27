// ============================================================================
// GK-HRMS — Transfer Store (Zustand v5)
// 3-Party Workflow: BM request → HR dispatch → Source BM accept/reject → HR confirm
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { API_BASE } from "@/lib/constants";
import { toast } from "sonner";
import { guardPermission } from "@/lib/guardPermission";
import type {
  Transfer,
  TransferRequestData,
  TransferDispatchData,
  SourceAcceptData,
  TransferExecutionData,
  TransferPhase,
} from "@/types/employee";
import { BRANCH_LIST } from "@/types/employee";
import type { EmployeeFormData } from "@/types/employee";
import {
  notifyTransferRequested,
  notifyTransferDispatched,
  notifyTransferSourceAccepted,
  notifyTransferSourceRejected,
  notifyTransferExecuted,
} from "@/lib/notificationHelpers";


const nowISO = () => new Date().toISOString();

/** Helper: lấy tên chi nhánh từ ID */
function branchName(id: string | null): string {
  if (!id) return "—";
  return BRANCH_LIST.find((b) => b.id === id)?.name.replace("Gia Khánh - ", "") ?? id;
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface TransferState {
  transfers: Transfer[];
  loading: boolean;
  error: string | null;

  fetchTransfers: () => Promise<void>;

  /** BM tạo đề xuất → phase='requested' */
  requestTransfer: (data: TransferRequestData) => Promise<void>;

  /** HR gửi phiếu đề nghị chi nhánh nguồn → phase='pending_source_approval' */
  dispatchToSource: (id: string, data: TransferDispatchData) => Promise<void>;

  /** BM nguồn chấp nhận → phase='approved' */
  acceptDispatch: (id: string, data: SourceAcceptData) => Promise<void>;

  /** BM nguồn từ chối → phase='rejected_by_source' */
  rejectDispatch: (id: string, reason: string) => Promise<void>;

  /** HR xác nhận chính thức → phase='active' */
  executeTransfer: (id: string, data: TransferExecutionData) => Promise<void>;

  /** Hoàn tất → phase='completed' */
  completeTransfer: (id: string) => Promise<void>;

  deleteTransfer: (id: string) => Promise<void>;

  // ── COMPUTED ──
  transfersByPhase: (phase: TransferPhase) => Transfer[];
  pendingCount: () => number;
  needsResponseCount: (branchId: string) => number;
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useTransferStore = create<TransferState>((set, get) => ({
  transfers: [],
  loading: false,
  error: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH
  // ═══════════════════════════════════════════════════════════════════════════

  fetchTransfers: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/transfers`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Transfer[] = await res.json();
      set({ transfers: data });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Không thể tải danh sách.",
      });
    } finally {
      set({ loading: false });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION 1: BM tạo đề xuất (→ requested)
  // ═══════════════════════════════════════════════════════════════════════════

  requestTransfer: async (data) => {
    // BM cần "approve" trên employees (đề xuất điều chuyển = approve action)
    if (!guardPermission("employees", "approve", (msg) => set({ error: msg }))) return;

    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();
    const now = nowISO();

    const newTransfer: Transfer = {
      id: crypto.randomUUID(),
      type: data.requestType,
      phase: "requested",

      requestedBy: currentUser.id,
      requestedByName: currentUser.username,
      requestedByBranchId: currentUser.branchId || "",
      direction: data.direction,
      requiredPosition: data.requiredPosition,
      requiredQuantity: data.requiredQuantity,
      requestedStartDate: data.requestedStartDate,
      requestedEndDate: data.requestedEndDate,
      reason: data.reason,

      // HR fields — null
      sourceBranchId: null,
      hrDispatchNote: null,
      hrDispatchedBy: null,
      hrDispatchedAt: null,

      // Source response — null
      sourceResponse: null,
      sourceResponseBy: null,
      sourceResponseAt: null,
      sourceResponseNote: null,

      // Official info — null
      employeeId: data.direction === "send" ? data.employeeId : null,
      employeeName: data.direction === "send" ? data.employeeName : null,
      fromBranchId: null,
      toBranchId: null,
      newPosition: null,
      decisionNumber: null,
      effectiveDate: null,
      endDate: null,
      allowance: null,
      executedBy: null,
      executedAt: null,

      createdAt: now,
      updatedAt: now,
    };

    const prev = get().transfers;
    set({ transfers: [...prev, newTransfer], error: null });

    try {
      const res = await fetch(`${API_BASE}/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTransfer),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã gửi đề xuất — HR sẽ xem xét và điều phối");
      notifyTransferRequested(newTransfer);

      // Audit log — fire-and-forget
      import("@/store/supplementStore").then(({ useSupplementStore }) => {
        useSupplementStore.getState().logAction({
          userId: currentUser.id,
          userName: currentUser.username,
          action: "create",
          module: "employees",
          targetId: newTransfer.id,
          targetName: `Đề xuất ${data.requestType === "permanent" ? "điều chuyển" : "hỗ trợ"} — ${data.requiredPosition}`,
          changes: null,
          ipAddress: "mock-ip",
        });
      }).catch(() => {});
    } catch (err) {
      set({ transfers: prev, error: err instanceof Error ? err.message : "Lỗi" });
      toast.error("Không thể gửi đề xuất");
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION 2: HR dispatch (requested → pending_source_approval)
  // ═══════════════════════════════════════════════════════════════════════════

  dispatchToSource: async (id, data) => {
    if (!guardPermission("employees", "approve", (msg) => set({ error: msg }))) return;

    const prev = get().transfers;
    const tfr = prev.find((t) => t.id === id);
    if (!tfr || tfr.phase !== "requested") return;

    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();

    const patch: Partial<Transfer> = {
      phase: "pending_source_approval",
      sourceBranchId: data.sourceBranchId,
      hrDispatchNote: data.hrDispatchNote,
      hrDispatchedBy: currentUser.id,
      hrDispatchedAt: nowISO(),
      sourceResponse: "pending",
      updatedAt: nowISO(),
    };

    set({
      transfers: prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã gửi phiếu đề nghị đến chi nhánh nguồn");
      const dispatched = get().transfers.find((t) => t.id === id);
      if (dispatched) notifyTransferDispatched(dispatched);

      // Audit log
      import("@/store/supplementStore").then(({ useSupplementStore }) => {
        useSupplementStore.getState().logAction({
          userId: currentUser.id,
          userName: currentUser.username,
          action: "update",
          module: "employees",
          targetId: id,
          targetName: `Điều phối → ${branchName(data.sourceBranchId)}`,
          changes: { phase: { before: "requested", after: "pending_source_approval" } },
          ipAddress: "mock-ip",
        });
      }).catch(() => {});
    } catch (err) {
      set({ transfers: prev, error: err instanceof Error ? err.message : "Lỗi" });
      toast.error("Không thể gửi phiếu đề nghị");
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION 3: Source BM Accept (pending_source_approval → approved)
  // ═══════════════════════════════════════════════════════════════════════════

  acceptDispatch: async (id, data) => {
    // BM nguồn chấp nhận = approve action trên employees
    if (!guardPermission("employees", "approve", (msg) => set({ error: msg }))) return;

    const prev = get().transfers;
    const tfr = prev.find((t) => t.id === id);
    if (!tfr || tfr.phase !== "pending_source_approval") return;

    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();

    const patch: Partial<Transfer> = {
      phase: "approved",
      sourceResponse: "accepted",
      sourceResponseBy: currentUser.id,
      sourceResponseAt: nowISO(),
      sourceResponseNote: data.note || null,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      updatedAt: nowISO(),
    };

    set({
      transfers: prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã chấp nhận — HR sẽ xác nhận chính thức");
      const accepted = get().transfers.find((t) => t.id === id);
      if (accepted) notifyTransferSourceAccepted(accepted);

      // Audit log
      import("@/store/supplementStore").then(({ useSupplementStore }) => {
        useSupplementStore.getState().logAction({
          userId: currentUser.id,
          userName: currentUser.username,
          action: "approve",
          module: "employees",
          targetId: id,
          targetName: `Chấp nhận điều chuyển — ${data.employeeName}`,
          changes: { phase: { before: "pending_source_approval", after: "approved" } },
          ipAddress: "mock-ip",
        });
      }).catch(() => {});
    } catch (err) {
      set({ transfers: prev, error: err instanceof Error ? err.message : "Lỗi" });
      toast.error("Không thể chấp nhận");
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION 4: Source BM Reject (pending_source_approval → rejected_by_source)
  // ═══════════════════════════════════════════════════════════════════════════

  rejectDispatch: async (id, reason) => {
    // BM nguồn từ chối = approve action trên employees
    if (!guardPermission("employees", "approve", (msg) => set({ error: msg }))) return;

    const prev = get().transfers;
    const tfr = prev.find((t) => t.id === id);
    if (!tfr || tfr.phase !== "pending_source_approval") return;

    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();

    const patch: Partial<Transfer> = {
      phase: "rejected_by_source",
      sourceResponse: "rejected",
      sourceResponseBy: currentUser.id,
      sourceResponseAt: nowISO(),
      sourceResponseNote: reason,
      updatedAt: nowISO(),
    };

    set({
      transfers: prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã từ chối — HR sẽ tìm chi nhánh khác");
      const rejected = get().transfers.find((t) => t.id === id);
      if (rejected) notifyTransferSourceRejected(rejected);

      import("@/store/supplementStore").then(({ useSupplementStore }) => {
        useSupplementStore.getState().logAction({
          userId: currentUser.id,
          userName: currentUser.username,
          action: "update",
          module: "employees",
          targetId: id,
          targetName: `Từ chối điều chuyển — ${reason.slice(0, 50)}`,
          changes: { phase: { before: "pending_source_approval", after: "rejected_by_source" } },
          ipAddress: "mock-ip",
        });
      }).catch(() => {});
    } catch (err) {
      set({ transfers: prev, error: err instanceof Error ? err.message : "Lỗi" });
      toast.error("Không thể từ chối");
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION 5: HR xác nhận chính thức (approved → active)
  // ═══════════════════════════════════════════════════════════════════════════

  executeTransfer: async (id, hrData) => {
    if (!guardPermission("employees", "approve", (msg) => set({ error: msg }))) return;

    const prev = get().transfers;
    const tfr = prev.find((t) => t.id === id);
    if (!tfr || tfr.phase !== "approved") return;

    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();

    const patch: Partial<Transfer> = {
      phase: "active",
      fromBranchId: hrData.fromBranchId,
      toBranchId: hrData.toBranchId,
      effectiveDate: hrData.effectiveDate,
      newPosition: hrData.newPosition || null,
      decisionNumber: hrData.decisionNumber || null,
      endDate: hrData.endDate || null,
      allowance: hrData.allowance ?? null,
      executedBy: currentUser.id,
      executedAt: nowISO(),
      updatedAt: nowISO(),
    };

    set({
      transfers: prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Side-effect: permanent → update employee branch
      if (tfr.type === "permanent" && tfr.employeeId) {
        try {
          const { useEmployeeStore } = await import("@/store/employeeStore");
          const updatePayload: Partial<EmployeeFormData> = { branchId: hrData.toBranchId };
          if (hrData.newPosition) updatePayload.position = hrData.newPosition;
          await useEmployeeStore.getState().updateEmployee(tfr.employeeId, updatePayload);
        } catch { /* silent */ }
      }

      toast.success("Đã xác nhận chính thức — điều chuyển đang thực hiện");
      const executed = get().transfers.find((t) => t.id === id);
      if (executed) notifyTransferExecuted(executed);

      import("@/store/supplementStore").then(({ useSupplementStore }) => {
        useSupplementStore.getState().logAction({
          userId: currentUser.id,
          userName: currentUser.username,
          action: "approve",
          module: "employees",
          targetId: id,
          targetName: `Xác nhận chính thức — ${tfr.employeeName ?? ""}`,
          changes: { phase: { before: "approved", after: "active" } },
          ipAddress: "mock-ip",
        });
      }).catch(() => {});
    } catch (err) {
      set({ transfers: prev, error: err instanceof Error ? err.message : "Lỗi" });
      toast.error("Không thể xác nhận");
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE (active → completed)
  // ═══════════════════════════════════════════════════════════════════════════

  completeTransfer: async (id) => {
    const prev = get().transfers;
    const tfr = prev.find((t) => t.id === id);
    if (!tfr || tfr.phase !== "active") return;

    const patch = { phase: "completed" as const, updatedAt: nowISO() };
    set({
      transfers: prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Temporary: return employee to source branch
      if (tfr.type === "temporary" && tfr.employeeId && tfr.fromBranchId) {
        try {
          const { useEmployeeStore } = await import("@/store/employeeStore");
          await useEmployeeStore.getState().updateEmployee(tfr.employeeId, { branchId: tfr.fromBranchId } as Partial<EmployeeFormData>);
        } catch { /* silent */ }
      }

      toast.success("Hoàn tất điều chuyển");
    } catch (err) {
      set({ transfers: prev, error: err instanceof Error ? err.message : "Lỗi" });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  deleteTransfer: async (id) => {
    if (!guardPermission("employees", "delete", (msg) => set({ error: msg }))) return;

    const prev = get().transfers;
    set({ transfers: prev.filter((t) => t.id !== id), error: null });
    try {
      const res = await fetch(`${API_BASE}/transfers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({ transfers: prev, error: err instanceof Error ? err.message : "Lỗi" });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  transfersByPhase: (phase) =>
    get().transfers
      .filter((t) => t.phase === phase)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  pendingCount: () =>
    get().transfers.filter((t) => t.phase === "requested").length,

  needsResponseCount: (branchId) =>
    get().transfers.filter(
      (t) => t.sourceBranchId === branchId && t.phase === "pending_source_approval"
    ).length,
}));
