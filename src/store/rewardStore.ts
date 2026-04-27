// ============================================================================
// GK-HRMS — Reward & Discipline Store (Zustand v5)
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { API_BASE } from "@/lib/constants";
import { toast } from "sonner";
import { guardPermission } from "@/lib/guardPermission";
import { logAudit } from "@/lib/auditHelper";
import type {
  RewardRecord,
  RewardFormData,
  DisciplineRecord,
  DisciplineFormData,
  DisciplineStatus,
} from "@/types/reward";



// ---------------------------------------------------------------------------
// Helper — ISO timestamp
// ---------------------------------------------------------------------------

const nowISO = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface RewardState {
  // ── STATE ──
  rewards: RewardRecord[];
  disciplines: DisciplineRecord[];
  rewardsLoading: boolean;
  disciplinesLoading: boolean;
  error: string | null;

  // ── ACTIONS — Rewards ──

  /**
   * Fetch danh sách khen thưởng.
   * @param employeeId — nếu có, chỉ lấy rewards của NV đó (query ?employeeId=)
   */
  fetchRewards: (employeeId?: string) => Promise<void>;

  /**
   * Fetch danh sách kỷ luật.
   * @param employeeId — nếu có, chỉ lấy disciplines của NV đó
   */
  fetchDisciplines: (employeeId?: string) => Promise<void>;

  /**
   * Tạo khen thưởng mới — optimistic update.
   * Generate id + timestamps, POST /rewards.
   */
  addReward: (data: RewardFormData) => Promise<void>;

  /**
   * Tạo kỷ luật mới — optimistic update.
   * Generate id + timestamps, POST /disciplines, default status='active'.
   */
  addDiscipline: (data: DisciplineFormData) => Promise<void>;

  /**
   * Cập nhật khen thưởng — PATCH /rewards/:id.
   */
  updateReward: (id: string, data: Partial<RewardFormData>) => Promise<void>;

  /**
   * Cập nhật kỷ luật — PATCH /disciplines/:id.
   */
  updateDiscipline: (
    id: string,
    data: Partial<DisciplineFormData & { status: DisciplineStatus }>
  ) => Promise<void>;

  /**
   * Xóa khen thưởng — optimistic, DELETE /rewards/:id.
   */
  deleteReward: (id: string) => Promise<void>;

  /**
   * Xóa kỷ luật — optimistic, DELETE /disciplines/:id.
   */
  deleteDiscipline: (id: string) => Promise<void>;

  // ── COMPUTED ──

  /** Rewards của 1 NV, sort effectiveDate desc (mới nhất trước) */
  rewardsByEmployee: (empId: string) => RewardRecord[];

  /** Disciplines của 1 NV, sort effectiveDate desc */
  disciplinesByEmployee: (empId: string) => DisciplineRecord[];

  /** Kỷ luật đang hiệu lực (status='active') — chưa hết hạn */
  activeDisciplines: () => DisciplineRecord[];

  /**
   * Rewards + Disciplines linked vào tháng chỉ định (YYYY-MM).
   * Dùng trong generatePayroll để tự động tính thưởng/phạt.
   */
  pendingPayrollLinks: (month: string) => {
    rewards: RewardRecord[];
    disciplines: DisciplineRecord[];
  };
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useRewardStore = create<RewardState>((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  rewards: [],
  disciplines: [],
  rewardsLoading: false,
  disciplinesLoading: false,
  error: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchRewards: async (employeeId) => {
    set({ rewardsLoading: true, error: null });
    try {
      const query = employeeId ? `?employeeId=${employeeId}` : "";
      const res = await fetch(`${API_BASE}/rewards${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data: RewardRecord[] = await res.json();

      // C4: Branch isolation
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

      set({ rewards: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách khen thưởng. Vui lòng thử lại.",
      });
    } finally {
      set({ rewardsLoading: false });
    }
  },

  fetchDisciplines: async (employeeId) => {
    set({ disciplinesLoading: true, error: null });
    try {
      const query = employeeId ? `?employeeId=${employeeId}` : "";
      const res = await fetch(`${API_BASE}/disciplines${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data: DisciplineRecord[] = await res.json();

      // C4: Branch isolation
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
        data = data.filter((d) => branchEmpIds.has(d.employeeId));
      }

      set({ disciplines: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách kỷ luật. Vui lòng thử lại.",
      });
    } finally {
      set({ disciplinesLoading: false });
    }
  },

  addReward: async (data) => {
    // Khen thưởng thuộc domain employees — dùng module "employees" để guard
    if (!guardPermission("employees", "create", (msg) => set({ error: msg })))
      return;

    const now = nowISO();
    const newReward: RewardRecord = {
      ...data,
      id: crypto.randomUUID(),
      approvedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic
    const prevRewards = get().rewards;
    set({ rewards: [...prevRewards, newReward], error: null });

    try {
      const res = await fetch(`${API_BASE}/rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReward),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã ghi nhận khen thưởng");

      // C2: Audit log — fire-and-forget
      logAudit({
        module: "rewards",
        action: "create",
        targetId: newReward.id,
        targetName: newReward.title,
        changes: { type: { before: null, after: data.type }, amount: { before: null, after: data.amount } },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tạo khen thưởng. Vui lòng thử lại.";
      set({ rewards: prevRewards, error: msg });
      toast.error(msg);
    }
  },

  addDiscipline: async (data) => {
    if (!guardPermission("employees", "create", (msg) => set({ error: msg })))
      return;

    const now = nowISO();
    const newDiscipline: DisciplineRecord = {
      ...data,
      id: crypto.randomUUID(),
      approvedBy: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    const prevDisciplines = get().disciplines;
    set({ disciplines: [...prevDisciplines, newDiscipline], error: null });

    try {
      const res = await fetch(`${API_BASE}/disciplines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDiscipline),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã ghi nhận kỷ luật");

      // C2: Audit log — fire-and-forget
      logAudit({
        module: "rewards",
        action: "create",
        targetId: newDiscipline.id,
        targetName: newDiscipline.title,
        changes: { type: { before: null, after: data.type }, penaltyAmount: { before: null, after: data.penaltyAmount } },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tạo kỷ luật. Vui lòng thử lại.";
      set({ disciplines: prevDisciplines, error: msg });
      toast.error(msg);
    }
  },

  updateReward: async (id, data) => {
    if (!guardPermission("employees", "update", (msg) => set({ error: msg })))
      return;

    const prevRewards = get().rewards;
    const patchData = { ...data, updatedAt: nowISO() };

    // Optimistic
    set({
      rewards: prevRewards.map((r) =>
        r.id === id ? { ...r, ...patchData } : r
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/rewards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        rewards: prevRewards,
        error:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật khen thưởng. Vui lòng thử lại.",
      });
    }
  },

  updateDiscipline: async (id, data) => {
    if (!guardPermission("employees", "update", (msg) => set({ error: msg })))
      return;

    const prevDisciplines = get().disciplines;
    const patchData = { ...data, updatedAt: nowISO() };

    set({
      disciplines: prevDisciplines.map((d) =>
        d.id === id ? { ...d, ...patchData } : d
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/disciplines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        disciplines: prevDisciplines,
        error:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật kỷ luật. Vui lòng thử lại.",
      });
    }
  },

  deleteReward: async (id) => {
    if (!guardPermission("employees", "delete", (msg) => set({ error: msg })))
      return;

    const prevRewards = get().rewards;

    // Optimistic
    set({
      rewards: prevRewards.filter((r) => r.id !== id),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/rewards/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã xóa khen thưởng");

      // C2: Audit log — fire-and-forget
      const deleted = prevRewards.find((r) => r.id === id);
      logAudit({
        module: "rewards",
        action: "delete",
        targetId: id,
        targetName: deleted?.title ?? id,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể xóa khen thưởng. Vui lòng thử lại.";
      set({ rewards: prevRewards, error: msg });
      toast.error(msg);
    }
  },

  deleteDiscipline: async (id) => {
    if (!guardPermission("employees", "delete", (msg) => set({ error: msg })))
      return;

    const prevDisciplines = get().disciplines;

    set({
      disciplines: prevDisciplines.filter((d) => d.id !== id),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/disciplines/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã xóa kỷ luật");

      // C2: Audit log — fire-and-forget
      const deleted = prevDisciplines.find((d) => d.id === id);
      logAudit({
        module: "rewards",
        action: "delete",
        targetId: id,
        targetName: deleted?.title ?? id,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể xóa kỷ luật. Vui lòng thử lại.";
      set({ disciplines: prevDisciplines, error: msg });
      toast.error(msg);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  rewardsByEmployee: (empId) => {
    return get()
      .rewards.filter((r) => r.employeeId === empId)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  },

  disciplinesByEmployee: (empId) => {
    return get()
      .disciplines.filter((d) => d.employeeId === empId)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  },

  activeDisciplines: () => {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    return get().disciplines.filter(
      (d) =>
        d.status === "active" &&
        // Chưa hết hạn: endDate = null (vô thời hạn) hoặc endDate >= today
        (d.endDate === null || d.endDate >= today)
    );
  },

  pendingPayrollLinks: (month) => {
    const { rewards, disciplines } = get();
    return {
      rewards: rewards.filter((r) => r.linkedPayrollMonth === month),
      disciplines: disciplines.filter((d) => d.linkedPayrollMonth === month),
    };
  },
}));
