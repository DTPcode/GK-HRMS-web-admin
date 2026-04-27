// ============================================================================
// GK-HRMS — Contract Store (Zustand v5)
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { API_BASE } from "@/lib/constants";
import { toast } from "sonner";
import { guardPermission } from "@/lib/guardPermission";
import { logAudit } from "@/lib/auditHelper";
import type {
  Contract,
  ContractFormData,
  ContractType,
  ContractStatus,
} from "@/types/contract";



// ---------------------------------------------------------------------------
// Filter Interface (local — không export vì chỉ dùng trong store)
// ---------------------------------------------------------------------------

interface ContractFilter {
  search?: string;
  type?: ContractType;
  status?: ContractStatus;
  employeeId?: string;
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface ContractState {
  // ── STATE ──
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  filter: ContractFilter;
  selectedIds: string[];

  // ── ACTIONS ──

  /**
   * Fetch toàn bộ hợp đồng từ json-server.
   * Side-effects: set loading → GET /contracts → set contracts.
   */
  fetchContracts: () => Promise<void>;

  /**
   * Tạo hợp đồng mới — optimistic update.
   * Business rule: không cho phép 2 contract "active" cùng employeeId.
   * Side-effects: validate → generate id → POST /contracts → rollback nếu lỗi.
   * @param data — payload từ ContractForm
   */
  addContract: (data: ContractFormData) => Promise<void>;

  /**
   * Cập nhật hợp đồng — PATCH (không phải PUT).
   * Side-effects: optimistic update → PATCH /contracts/:id → rollback nếu lỗi.
   * @param id — contract ID
   * @param data — chỉ fields cần cập nhật
   */
  updateContract: (id: string, data: Partial<ContractFormData>) => Promise<void>;

  /**
   * Xóa hợp đồng — optimistic update.
   * Side-effects: xóa khỏi state + selectedIds → DELETE → rollback nếu lỗi.
   * @param id — contract ID cần xóa
   */
  deleteContract: (id: string) => Promise<void>;

  /**
   * Gia hạn hợp đồng: đặt HĐ cũ → expired, tạo HĐ mới "active".
   * Side-effects:
   *   1. PATCH HĐ cũ: status = "expired"
   *   2. POST HĐ mới: copy từ HĐ cũ + newEndDate + newSalary
   * @param id — ID hợp đồng cũ
   * @param newEndDate — ngày kết thúc mới "YYYY-MM-DD" (null nếu indefinite)
   * @param newSalary — mức lương mới
   */
  renewContract: (id: string, newEndDate: string | null, newSalary: number) => Promise<void>;

  /** Backward-compat alias cho addContract */
  createContract: (data: ContractFormData) => Promise<void>;

  setFilter: (partial: Partial<ContractFilter>) => void;
  resetFilter: () => void;
  toggleSelectId: (id: string) => void;
  clearSelection: () => void;

  // ── COMPUTED ──

  /** Hợp đồng sẽ hết hạn trong 30 ngày tới — dùng cho Dashboard alert */
  expiringContracts: () => Contract[];

  /** Lấy tất cả hợp đồng của 1 nhân viên — dùng cho EmployeeDetail tabs */
  contractsByEmployee: (empId: string) => Contract[];

  /** Đếm theo loại HĐ */
  getCountByType: () => Record<string, number>;

  /** Đếm theo trạng thái */
  getCountByStatus: () => Record<string, number>;
}

// ---------------------------------------------------------------------------
// Default Values
// ---------------------------------------------------------------------------

const DEFAULT_FILTER: ContractFilter = {
  search: "",
  type: undefined,
  status: undefined,
  employeeId: undefined,
};

const nowISO = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useContractStore = create<ContractState>((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  contracts: [],
  loading: false,
  error: null,
  filter: { ...DEFAULT_FILTER },
  selectedIds: [],

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchContracts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/contracts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data: Contract[] = await res.json();

      // C4: Branch isolation — branch_manager chỉ thấy contract chi nhánh mình
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
        data = data.filter((c) => branchEmpIds.has(c.employeeId));
      }

      set({ contracts: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách hợp đồng. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  addContract: async (data) => {
    if (!guardPermission("contracts", "create", (msg) => set({ error: msg }))) return;

    // Business rule: không thể có 2 contract "active" cùng lúc cho 1 NV
    if (data.status === "active") {
      const existingActive = get().contracts.find(
        (c) => c.employeeId === data.employeeId && c.status === "active"
      );
      if (existingActive) {
        set({ error: "Nhân viên này đã có hợp đồng đang hiệu lực. Vui lòng kết thúc hợp đồng cũ trước." });
        return;
      }
    }

    const now = nowISO();
    const newContract: Contract = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const prev = get().contracts;
    set({ contracts: [...prev, newContract], error: null });

    try {
      const res = await fetch(`${API_BASE}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContract),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã tạo hợp đồng mới");

      // C2: Audit log — fire-and-forget
      logAudit({
        module: "contracts",
        action: "create",
        targetId: newContract.id,
        targetName: `HĐ ${newContract.employeeId}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tạo hợp đồng mới. Vui lòng thử lại.";
      set({ contracts: prev, error: msg });
      toast.error(msg);
    }
  },

  updateContract: async (id, data) => {
    if (!guardPermission("contracts", "update", (msg) => set({ error: msg }))) return;

    const prev = get().contracts;
    const patchData = { ...data, updatedAt: nowISO() };

    set({
      contracts: prev.map((c) => (c.id === id ? { ...c, ...patchData } : c)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        contracts: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật hợp đồng. Vui lòng thử lại.",
      });
    }
  },

  deleteContract: async (id) => {
    if (!guardPermission("contracts", "delete", (msg) => set({ error: msg }))) return;

    const prev = get().contracts;
    const prevIds = get().selectedIds;

    set({
      contracts: prev.filter((c) => c.id !== id),
      selectedIds: prevIds.filter((sid) => sid !== id),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/contracts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã xóa hợp đồng");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể xóa hợp đồng. Vui lòng thử lại.";
      set({ contracts: prev, selectedIds: prevIds, error: msg });
      toast.error(msg);
    }
  },

  renewContract: async (id, newEndDate, newSalary) => {
    // M4: Thêm guardPermission
    if (!guardPermission("contracts", "create", (msg) => set({ error: msg }))) return;

    const oldContract = get().contracts.find((c) => c.id === id);
    if (!oldContract) {
      set({ error: "Không tìm thấy hợp đồng cần gia hạn." });
      return;
    }

    set({ loading: true, error: null });
    try {
      // 1. Đóng HĐ cũ → expired
      const expireRes = await fetch(`${API_BASE}/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "expired", updatedAt: nowISO() }),
      });
      if (!expireRes.ok) throw new Error(`Không thể đóng hợp đồng cũ (HTTP ${expireRes.status})`);

      // 2. Tạo HĐ mới kế thừa
      const now = nowISO();
      const newContract: Contract = {
        id: crypto.randomUUID(),
        employeeId: oldContract.employeeId,
        type: oldContract.type,
        startDate: oldContract.endDate ?? new Date().toISOString().slice(0, 10),
        endDate: newEndDate,
        baseSalary: newSalary,
        allowances: oldContract.allowances,
        status: "active",
        documentUrl: undefined,
        createdAt: now,
        updatedAt: now,
      };

      const createRes = await fetch(`${API_BASE}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContract),
      });
      if (!createRes.ok) throw new Error(`Không thể tạo hợp đồng mới (HTTP ${createRes.status})`);

      // Cập nhật state: đóng cũ + thêm mới
      set((state) => ({
        contracts: [
          ...state.contracts.map((c) =>
            c.id === id ? { ...c, status: "expired" as const, updatedAt: now } : c
          ),
          newContract,
        ],
      }));

      toast.success("Đã gia hạn hợp đồng");

      // C2: Audit log — fire-and-forget
      logAudit({
        module: "contracts",
        action: "create",
        targetId: newContract.id,
        targetName: `Gia hạn HĐ ${oldContract.id}`,
        changes: {
          baseSalary: { before: oldContract.baseSalary, after: newSalary },
          endDate: { before: oldContract.endDate, after: newEndDate },
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể gia hạn hợp đồng. Vui lòng thử lại.";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ loading: false });
    }
  },

  // Backward-compat
  createContract: async (data) => {
    await get().addContract(data);
  },

  setFilter: (partial) => {
    set((state) => ({ filter: { ...state.filter, ...partial } }));
  },

  resetFilter: () => {
    set({ filter: { ...DEFAULT_FILTER } });
  },

  toggleSelectId: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id],
    }));
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  expiringContracts: () => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return get().contracts.filter((c) => {
      if (c.status !== "active" || !c.endDate) return false;
      const end = new Date(c.endDate);
      return end >= now && end <= thirtyDays;
    });
  },

  contractsByEmployee: (empId) => {
    return get().contracts.filter((c) => c.employeeId === empId);
  },

  getCountByType: () => {
    return get().contracts.reduce<Record<string, number>>((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {});
  },

  getCountByStatus: () => {
    return get().contracts.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
  },
}));
