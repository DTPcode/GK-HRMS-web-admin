// ============================================================================
// GK-HRMS — Offboarding Store (Zustand v5)
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// Side-effects: cross-store update employeeStore + accountStore khi approve/complete
// ============================================================================

import { create } from "zustand";
import { API_BASE } from "@/lib/constants";
import { toast } from "sonner";
import { guardPermission } from "@/lib/guardPermission";
import { logAudit } from "@/lib/auditHelper";
import type {
  ResignationRequest,
  ResignationFormData,
} from "@/types/offboarding";
import type { EmployeeFormData } from "@/types/employee";
import {
  notifyResignationSubmitted,
  notifyResignationApproved,
  notifyResignationRejected,
} from "@/lib/notificationHelpers";



// ---------------------------------------------------------------------------
// Helper — ISO timestamp
// ---------------------------------------------------------------------------

const nowISO = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface OffboardingState {
  // ── STATE ──
  requests: ResignationRequest[];
  loading: boolean;
  error: string | null;

  // ── ACTIONS ──

  /** Fetch toàn bộ đơn nghỉ việc — GET /resignations */
  fetchRequests: () => Promise<void>;

  /**
   * NV/HR nộp đơn nghỉ việc — POST /resignations.
   * Default status = 'pending'.
   */
  submitResignation: (data: ResignationFormData) => Promise<void>;

  /**
   * Phê duyệt đơn nghỉ việc — PATCH status='approved'.
   * Side-effects:
   *   1. Set employee.status = 'resigned' trong employeeStore
   *   2. Set accountDeactivatedAt = now trong resignation record
   */
  approveResignation: (id: string) => Promise<void>;

  /**
   * Từ chối đơn nghỉ việc — PATCH status='rejected'.
   * @param reason — lý do từ chối (bắt buộc)
   */
  rejectResignation: (id: string, reason: string) => Promise<void>;

  /**
   * Hoàn tất offboarding — PATCH status='completed'.
   * Side-effects:
   *   1. Set employee.status = 'resigned' (nếu chưa)
   *   2. Set account.isActive = false qua accountStore
   * @param note — ghi chú bàn giao
   */
  completeOffboarding: (id: string, note?: string) => Promise<void>;

  // ── COMPUTED ──

  /** Đơn chờ duyệt — status='pending', sort submittedDate asc (cũ nhất trước) */
  pendingRequests: () => ResignationRequest[];

  /** Đơn đã duyệt, chờ complete — status='approved' */
  approvedRequests: () => ResignationRequest[];
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useOffboardingStore = create<OffboardingState>((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  requests: [],
  loading: false,
  error: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchRequests: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/resignations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data: ResignationRequest[] = await res.json();

      // M10: Branch isolation — branch_manager chỉ thấy đơn chi nhánh mình
      const { useAccountStore } = await import("@/store/accountStore");
      const currentUser = useAccountStore.getState().currentUser;
      if (currentUser?.role === "branch_manager" && currentUser.branchId) {
        const { useEmployeeStore } = await import("@/store/employeeStore");
        const empStore = useEmployeeStore.getState();
        if (empStore.employees.length === 0) await empStore.fetchEmployees();
        const branchEmpIds = new Set(
          useEmployeeStore.getState().employees
            .filter((e) => e.branchId === currentUser.branchId)
            .map((e) => e.id)
        );
        data = data.filter((r) => branchEmpIds.has(r.employeeId));
      }

      set({ requests: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách đơn nghỉ việc. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  submitResignation: async (data) => {
    // BM + HR đều có employees.approve → dùng "approve" thay vì "create"
    if (!guardPermission("employees", "approve", (msg) => set({ error: msg })))
      return;

    const now = nowISO();
    const newRequest: ResignationRequest = {
      ...data,
      id: crypto.randomUUID(),
      status: "pending",
      approvedBy: null,
      approvedAt: null,
      accountDeactivatedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic
    const prevRequests = get().requests;
    set({ requests: [...prevRequests, newRequest], error: null });

    try {
      const res = await fetch(`${API_BASE}/resignations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRequest),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã nộp đơn nghỉ việc");

      // Notification → HR nhận thông báo có đơn mới
      const { useEmployeeStore } = await import("@/store/employeeStore");
      const emp = useEmployeeStore.getState().employees.find(
        (e) => e.id === data.employeeId
      );
      if (emp) {
        notifyResignationSubmitted(newRequest, emp.name);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể nộp đơn nghỉ việc. Vui lòng thử lại.";
      set({ requests: prevRequests, error: msg });
      toast.error(msg);
    }
  },

  approveResignation: async (id) => {
    if (!guardPermission("employees", "approve", (msg) => set({ error: msg })))
      return;

    const prevRequests = get().requests;
    const request = prevRequests.find((r) => r.id === id);
    if (!request) {
      set({ error: "Không tìm thấy đơn nghỉ việc." });
      return;
    }

    const now = nowISO();

    // Lấy currentUser để ghi approvedBy
    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();

    const patchData = {
      status: "approved" as const,
      approvedBy: currentUser.id,
      approvedAt: now,
      accountDeactivatedAt: now,
      updatedAt: now,
    };

    // Optimistic update resignation
    set({
      requests: prevRequests.map((r) =>
        r.id === id ? { ...r, ...patchData } : r
      ),
      error: null,
    });

    try {
      // 1. PATCH resignation — this is the critical operation
      const res = await fetch(`${API_BASE}/resignations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã duyệt đơn nghỉ việc");
    } catch (err) {
      // Only revert if the PATCH itself failed
      const msg = err instanceof Error ? err.message : "Không thể phê duyệt đơn nghỉ việc. Vui lòng thử lại.";
      set({ requests: prevRequests, error: msg });
      toast.error(msg);
      return; // Exit early — don't run side-effects
    }

    // 2. Side-effects — fire-and-forget, don't revert resignation on failure
    try {
      const { useEmployeeStore } = await import("@/store/employeeStore");
      await useEmployeeStore
        .getState()
        .updateEmployee(request.employeeId, { status: "resigned" } as Partial<EmployeeFormData>);

      // C2: Audit log
      logAudit({
        module: "offboarding",
        action: "approve",
        targetId: id,
        targetName: `Đơn nghỉ việc NV ${request.employeeId}`,
        changes: { status: { before: "pending", after: "approved" } },
      });

      // Notification — look up employee for name + branchId
      const emp = useEmployeeStore.getState().employees.find(
        (e) => e.id === request.employeeId
      );
      if (emp) {
        notifyResignationApproved(request, emp.name, emp.branchId);
      }
    } catch (sideEffectErr) {
      console.error("Offboarding side-effect error:", sideEffectErr);
    }
  },

  rejectResignation: async (id, reason) => {
    if (!guardPermission("employees", "approve", (msg) => set({ error: msg })))
      return;

    const prevRequests = get().requests;

    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();

    const patchData = {
      status: "rejected" as const,
      approvedBy: currentUser.id,
      approvedAt: nowISO(),
      // Ghi lý do vào handoverNote vì schema không có rejectionReason riêng
      handoverNote: `[Từ chối] ${reason}`,
      updatedAt: nowISO(),
    };

    set({
      requests: prevRequests.map((r) =>
        r.id === id ? { ...r, ...patchData } : r
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/resignations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã từ chối đơn nghỉ việc");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể từ chối đơn nghỉ việc. Vui lòng thử lại.";
      set({ requests: prevRequests, error: msg });
      toast.error(msg);
      return;
    }

    // Side-effects — fire-and-forget
    try {
      logAudit({
        module: "offboarding",
        action: "reject",
        targetId: id,
        targetName: `Đơn nghỉ việc #${id.slice(0, 8)}`,
        changes: { status: { before: "pending", after: "rejected" }, reason: { before: null, after: reason } },
      });

      const { useEmployeeStore } = await import("@/store/employeeStore");
      const req = get().requests.find((r) => r.id === id);
      if (req) {
        const emp = useEmployeeStore.getState().employees.find(
          (e) => e.id === req.employeeId
        );
        if (emp) {
          notifyResignationRejected(req, emp.name, emp.branchId);
        }
      }
    } catch (sideEffectErr) {
      console.error("Offboarding reject side-effect error:", sideEffectErr);
    }
  },

  completeOffboarding: async (id, note) => {
    if (!guardPermission("employees", "approve", (msg) => set({ error: msg })))
      return;

    const prevRequests = get().requests;
    const request = prevRequests.find((r) => r.id === id);
    if (!request) {
      set({ error: "Không tìm thấy đơn nghỉ việc." });
      return;
    }

    const now = nowISO();
    const patchData = {
      status: "completed" as const,
      handoverNote: note ?? request.handoverNote,
      accountDeactivatedAt: request.accountDeactivatedAt ?? now,
      updatedAt: now,
    };

    set({
      requests: prevRequests.map((r) =>
        r.id === id ? { ...r, ...patchData } : r
      ),
      error: null,
    });

    try {
      // 1. PATCH resignation
      const res = await fetch(`${API_BASE}/resignations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 2. Side-effect: set employee.status = 'resigned' (nếu chưa)
      const { useEmployeeStore } = await import("@/store/employeeStore");
      await useEmployeeStore
        .getState()
        .updateEmployee(request.employeeId, { status: "resigned" } as Partial<EmployeeFormData>);

      // 3. Side-effect: deactivate account — PATCH /accounts?employeeId=xxx
      const { useAccountStore } = await import("@/store/accountStore");
      const accountState = useAccountStore.getState();
      const account = accountState.accounts.find(
        (a) => a.employeeId === request.employeeId
      );
      if (account) {
        await accountState.updateAccount(account.id, { isActive: false });
      }

      toast.success("Đã hoàn tất quy trình nghỉ việc");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể hoàn tất offboarding. Vui lòng thử lại.";
      set({ requests: prevRequests, error: msg });
      toast.error(msg);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  pendingRequests: () => {
    return get()
      .requests.filter((r) => r.status === "pending")
      .sort((a, b) => a.submittedDate.localeCompare(b.submittedDate));
  },

  approvedRequests: () => {
    return get()
      .requests.filter((r) => r.status === "approved")
      .sort((a, b) => a.submittedDate.localeCompare(b.submittedDate));
  },
}));
