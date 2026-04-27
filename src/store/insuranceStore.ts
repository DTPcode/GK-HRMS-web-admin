// ============================================================================
// GK-HRMS — Insurance Store (Zustand v5)
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { API_BASE } from "@/lib/constants";
import { toast } from "sonner";
import { guardPermission } from "@/lib/guardPermission";
import type {
  InsuranceRecord,
  InsuranceFormData,
  InsuranceSummary,
} from "@/types/insurance";
import { computeInsuranceSummary, INSURANCE_RATE_CONFIG } from "@/types/insurance";



// ---------------------------------------------------------------------------
// Helper — ISO timestamp
// ---------------------------------------------------------------------------

const nowISO = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface InsuranceState {
  // ── STATE ──
  records: InsuranceRecord[];
  loading: boolean;
  error: string | null;

  // ── ACTIONS ──

  /**
   * Fetch danh sách bảo hiểm.
   * @param employeeId — nếu có, chỉ lấy records của NV đó
   */
  fetchInsurance: (employeeId?: string) => Promise<void>;

  /**
   * Tạo bản ghi bảo hiểm mới — POST /insurance.
   * Mỗi NV chỉ nên có 1 record active tại 1 thời điểm.
   */
  createInsurance: (data: InsuranceFormData) => Promise<void>;

  /**
   * Cập nhật thông tin bảo hiểm — PATCH /insurance/:id.
   */
  updateInsurance: (id: string, data: Partial<InsuranceFormData>) => Promise<void>;

  /**
   * Tạm dừng đóng BH — PATCH status='suspended'.
   * Dùng khi NV nghỉ không lương, tạm hoãn đóng BH.
   */
  suspendInsurance: (id: string) => Promise<void>;

  /**
   * Ngừng đóng BH — PATCH status='terminated', endDate = today.
   * Dùng khi NV nghỉ việc, chấm dứt HĐLĐ.
   */
  terminateInsurance: (id: string) => Promise<void>;

  // ── COMPUTED ──

  /** Record active của 1 NV — null nếu chưa có hoặc đã terminated */
  insuranceByEmployee: (empId: string) => InsuranceRecord | null;

  /**
   * Tổng đóng BH toàn công ty tháng này.
   * Chỉ tính records status='active'.
   */
  monthlySummary: () => {
    totalEmployeeContribution: number;
    totalEmployerContribution: number;
    totalContribution: number;
    activeCount: number;
  };

  /**
   * Tính InsuranceSummary cho 1 mức lương đóng BH.
   * Dùng default rates từ INSURANCE_RATE_CONFIG.
   * Pure function — không phụ thuộc state.
   */
  calculateContributions: (insuredSalary: number) => InsuranceSummary;
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useInsuranceStore = create<InsuranceState>((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  records: [],
  loading: false,
  error: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchInsurance: async (employeeId) => {
    set({ loading: true, error: null });
    try {
      const query = employeeId ? `?employeeId=${employeeId}` : "";
      const res = await fetch(`${API_BASE}/insurance${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data: InsuranceRecord[] = await res.json();

      // C4: Branch isolation
      if (!employeeId) {
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
      }

      set({ records: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách bảo hiểm. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  createInsurance: async (data) => {
    // Bảo hiểm thuộc domain employees
    if (!guardPermission("employees", "create", (msg) => set({ error: msg })))
      return;

    const now = nowISO();
    const newRecord: InsuranceRecord = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic
    const prevRecords = get().records;
    set({ records: [...prevRecords, newRecord], error: null });

    try {
      const res = await fetch(`${API_BASE}/insurance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã khai báo bảo hiểm");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tạo bản ghi bảo hiểm. Vui lòng thử lại.";
      set({ records: prevRecords, error: msg });
      toast.error(msg);
    }
  },

  updateInsurance: async (id, data) => {
    if (!guardPermission("employees", "update", (msg) => set({ error: msg })))
      return;

    const prevRecords = get().records;
    const patchData = { ...data, updatedAt: nowISO() };

    // Optimistic
    set({
      records: prevRecords.map((r) =>
        r.id === id ? { ...r, ...patchData } : r
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/insurance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã cập nhật bảo hiểm");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật bảo hiểm. Vui lòng thử lại.";
      set({ records: prevRecords, error: msg });
      toast.error(msg);
    }
  },

  suspendInsurance: async (id) => {
    if (!guardPermission("employees", "update", (msg) => set({ error: msg })))
      return;

    const prevRecords = get().records;
    const patchData = { status: "suspended" as const, updatedAt: nowISO() };

    set({
      records: prevRecords.map((r) =>
        r.id === id ? { ...r, ...patchData } : r
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/insurance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã tạm dừng bảo hiểm");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tạm dừng bảo hiểm. Vui lòng thử lại.";
      set({ records: prevRecords, error: msg });
      toast.error(msg);
    }
  },

  terminateInsurance: async (id) => {
    if (!guardPermission("employees", "update", (msg) => set({ error: msg })))
      return;

    const prevRecords = get().records;
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const patchData = {
      status: "terminated" as const,
      endDate: today,
      updatedAt: nowISO(),
    };

    set({
      records: prevRecords.map((r) =>
        r.id === id ? { ...r, ...patchData } : r
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/insurance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        records: prevRecords,
        error:
          err instanceof Error
            ? err.message
            : "Không thể ngừng bảo hiểm. Vui lòng thử lại.",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  insuranceByEmployee: (empId) => {
    return (
      get().records.find(
        (r) => r.employeeId === empId && r.status === "active"
      ) ?? null
    );
  },

  monthlySummary: () => {
    const activeRecords = get().records.filter((r) => r.status === "active");

    let totalEmployeeContribution = 0;
    let totalEmployerContribution = 0;

    for (const record of activeRecords) {
      const summary = computeInsuranceSummary(record);
      totalEmployeeContribution += summary.employeeContribution;
      totalEmployerContribution += summary.employerContribution;
    }

    return {
      totalEmployeeContribution,
      totalEmployerContribution,
      totalContribution: totalEmployeeContribution + totalEmployerContribution,
      activeCount: activeRecords.length,
    };
  },

  calculateContributions: (insuredSalary) => {
    // Dùng default rates theo luật VN 2024
    return computeInsuranceSummary({
      insuredSalary,
      bhxhRate: INSURANCE_RATE_CONFIG.bhxh.employee,
      bhytRate: INSURANCE_RATE_CONFIG.bhyt.employee,
      bhtnRate: INSURANCE_RATE_CONFIG.bhtn.employee,
      bhxhEmployer: INSURANCE_RATE_CONFIG.bhxh.employer,
      bhytEmployer: INSURANCE_RATE_CONFIG.bhyt.employer,
      bhtnEmployer: INSURANCE_RATE_CONFIG.bhtn.employer,
    });
  },
}));
