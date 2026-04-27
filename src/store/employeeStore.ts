// ============================================================================
// GK-HRMS — Employee Store (Zustand v5)
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { API_BASE } from "@/lib/constants";
import { toast } from "sonner";
import { guardPermission } from "@/lib/guardPermission";
import { logAudit } from "@/lib/auditHelper";
import type {
  Employee,
  EmployeeFormData,
  EmployeeFilter,
  EmployeeStatus,
  BankAccount,
  BankAccountFormData,
  Qualification,
  QualificationFormData,
} from "@/types/employee";



// ---------------------------------------------------------------------------
// Stats Interface
// ---------------------------------------------------------------------------

/** Thống kê tổng quan — dùng cho Dashboard StatCards */
interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  resigned: number;
  /** Lương trung bình toàn bộ NV (VND) */
  avgSalary: number;
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface EmployeeState {
  // ── STATE ──
  employees: Employee[];
  loading: boolean;
  error: string | null;
  filter: EmployeeFilter;
  /** Danh sách ID đang chọn — dùng cho bulk actions (xóa, xuất...) */
  selectedIds: string[];

  /** Danh sách tài khoản ngân hàng — fetch theo employeeId */
  bankAccounts: BankAccount[];

  /** Danh sách bằng cấp / chứng chỉ — fetch theo employeeId */
  qualifications: Qualification[];

  // ── ACTIONS ──

  /**
   * Fetch toàn bộ danh sách nhân viên từ json-server.
   * Side-effects: set loading → fetch GET /employees → set employees.
   * Filtering/sorting/pagination được xử lý client-side bởi computed functions.
   */
  fetchEmployees: () => Promise<void>;

  /**
   * Tạo nhân viên mới — optimistic update.
   * Side-effects:
   *   1. Generate id = `emp-${Date.now()}`, createdAt/updatedAt = now ISO
   *   2. Thêm vào state ngay lập tức (UX nhanh)
   *   3. POST /employees → nếu lỗi → rollback (xóa khỏi state)
   * Tại sao optimistic: json-server gần như không fail → UX nhanh hơn.
   * @param data — payload từ EmployeeForm (không có id, timestamps)
   */
  addEmployee: (data: EmployeeFormData) => Promise<void>;

  /**
   * Cập nhật thông tin nhân viên — PATCH (không phải PUT).
   * Side-effects:
   *   1. Cập nhật state ngay (optimistic)
   *   2. PATCH /employees/:id → nếu lỗi → rollback về bản cũ
   * Tại sao PATCH: chỉ gửi fields thay đổi, không ghi đè fields khác.
   * @param id — employee ID
   * @param data — chỉ fields cần cập nhật
   */
  updateEmployee: (id: string, data: Partial<EmployeeFormData>) => Promise<void>;

  /**
   * Xóa nhân viên — optimistic update.
   * Side-effects:
   *   1. Xóa khỏi state + selectedIds ngay lập tức
   *   2. DELETE /employees/:id → nếu lỗi → rollback (thêm lại)
   * @param id — employee ID cần xóa
   */
  deleteEmployee: (id: string) => Promise<void>;

  /**
   * Cập nhật filter — merge với filter hiện tại.
   * Khi thay đổi bất kỳ field nào trừ `page` → tự động reset page về 1.
   * Tại sao reset page: user ở trang 3, đổi filter → trang 3 có thể không tồn tại.
   * @param partial — fields filter cần cập nhật
   */
  setFilter: (partial: Partial<EmployeeFilter>) => void;

  /** Reset filter về mặc định — page 1, pageSize 20, xóa hết filter */
  resetFilter: () => void;

  /**
   * Toggle chọn 1 nhân viên cho bulk actions.
   * Add nếu chưa có, remove nếu đã có trong selectedIds.
   * @param id — employee ID
   */
  toggleSelectId: (id: string) => void;

  /** Bỏ chọn tất cả — set selectedIds = [] */
  clearSelection: () => void;

  // ── BANK ACCOUNT ACTIONS ──

  /** Fetch TK ngân hàng theo nhân viên — GET /bank-accounts?employeeId=X */
  fetchBankAccounts: (employeeId: string) => Promise<void>;

  /** Thêm TK ngân hàng mới — optimistic update */
  addBankAccount: (data: BankAccountFormData) => Promise<void>;

  /** Cập nhật TK ngân hàng — PATCH /bank-accounts/:id */
  updateBankAccount: (id: string, data: Partial<BankAccountFormData>) => Promise<void>;

  /** Xóa TK ngân hàng — DELETE /bank-accounts/:id. Không xóa isPrimary nếu còn TK khác */
  deleteBankAccount: (id: string) => Promise<void>;

  /** Đặt TK nhận lương chính — unset tất cả TK khác cùng employeeId */
  setPrimaryAccount: (id: string) => Promise<void>;

  // ── QUALIFICATION ACTIONS ──

  /** Fetch bằng cấp theo nhân viên — GET /qualifications?employeeId=X */
  fetchQualifications: (employeeId: string) => Promise<void>;

  /** Thêm bằng cấp mới — optimistic update */
  addQualification: (data: QualificationFormData) => Promise<void>;

  /** Cập nhật bằng cấp — PATCH /qualifications/:id */
  updateQualification: (id: string, data: Partial<QualificationFormData>) => Promise<void>;

  /** Xóa bằng cấp — DELETE /qualifications/:id */
  deleteQualification: (id: string) => Promise<void>;

  // ── COMPUTED (functions, không phải state) ──
  // Tại sao function không phải state: luôn đúng, không cần sync 2 chỗ.

  /**
   * Danh sách NV đã filter + sort.
   * - Search: case-insensitive trên name + email + phone
   * - Filter: department, branchId, status, salaryType
   * - Sort: theo sortBy + sortOrder
   */
  filteredEmployees: () => Employee[];

  /**
   * Danh sách NV đã phân trang — slice từ filteredEmployees().
   * Dùng trong: EmployeeTable, EmployeeGrid.
   */
  paginatedEmployees: () => Employee[];

  /**
   * Tổng số NV sau filter — dùng cho pagination UI.
   * = filteredEmployees().length
   */
  totalFiltered: () => number;

  /**
   * Thống kê tổng quan từ employees[] gốc (KHÔNG phải filtered).
   * Tại sao từ gốc: stats trên Dashboard cần số liệu toàn bộ, không phụ thuộc filter.
   */
  stats: () => EmployeeStats;

  // ── BACKWARD-COMPAT COMPUTED ──
  // Giữ lại cho consumers cũ (DashboardClient, HeadcountChart, TurnoverChart)

  /** @deprecated — dùng stats().active thay thế */
  getActiveCount: () => number;
  /** Đếm NV theo phòng ban — dùng cho HeadcountChart, DeptBreakdown */
  getCountByDepartment: () => Record<string, number>;
  /** Đếm NV theo trạng thái — dùng cho TurnoverChart */
  getCountByStatus: () => Record<string, number>;
}

// ---------------------------------------------------------------------------
// Default Values
// ---------------------------------------------------------------------------

const DEFAULT_FILTER: EmployeeFilter = {
  search: "",
  departmentId: undefined,
  branchId: undefined,
  status: undefined,
  salaryType: undefined,
  sortBy: undefined,
  sortOrder: undefined,
  page: 1,
  pageSize: 20,
};

// ---------------------------------------------------------------------------
// Helper — ISO timestamp
// ---------------------------------------------------------------------------

/** ISO 8601 string cho thời điểm hiện tại */
const nowISO = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  employees: [],
  loading: false,
  error: null,
  filter: { ...DEFAULT_FILTER },
  selectedIds: [],
  bankAccounts: [],
  qualifications: [],

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchEmployees: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/employees`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data: Employee[] = await res.json();

      // DATA FILTER: branch_manager chỉ thấy NV chi nhánh mình
      // Lấy currentUser từ accountStore (cross-store access)
      // TODO: Replace với server-side filtering khi backend sẵn
      const { useAccountStore } = await import("@/store/accountStore");
      const { currentUser } = useAccountStore.getState();
      if (
        currentUser.role === "branch_manager" &&
        currentUser.branchId
      ) {
        data = data.filter((e) => e.branchId === currentUser.branchId);
      }

      set({ employees: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách nhân viên. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  addEmployee: async (data) => {
    if (!guardPermission("employees", "create", (msg) => set({ error: msg }))) return;

    const now = nowISO();
    const newEmployee: Employee = {
      ...data,
      // Salary managed via Contract — default placeholder values
      salary: 0,
      salaryType: "monthly",
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic: thêm vào state ngay
    const prevEmployees = get().employees;
    set({ employees: [...prevEmployees, newEmployee], error: null });

    try {
      const res = await fetch(`${API_BASE}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã thêm nhân viên mới");

      // C2: Audit log — fire-and-forget
      logAudit({
        module: "employees",
        action: "create",
        targetId: newEmployee.id,
        targetName: newEmployee.name,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tạo nhân viên mới. Vui lòng thử lại.";
      set({ employees: prevEmployees, error: msg });
      toast.error(msg);
    }
  },

  updateEmployee: async (id, data) => {
    if (!guardPermission("employees", "update", (msg) => set({ error: msg }))) return;

    const prevEmployees = get().employees;
    const now = nowISO();

    const patchData = { ...data, updatedAt: now };

    // Optimistic: cập nhật state ngay
    set({
      employees: prevEmployees.map((e) =>
        e.id === id ? { ...e, ...patchData } : e
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã cập nhật thông tin");

      // C2: Audit log — fire-and-forget
      const emp = prevEmployees.find((e) => e.id === id);
      const changes: Record<string, { before: unknown; after: unknown }> = {};
      if (emp) {
        for (const key of Object.keys(data) as (keyof typeof data)[]) {
          const before = emp[key as keyof Employee];
          const after = data[key];
          if (before !== after) {
            changes[key] = { before, after };
          }
        }
      }
      logAudit({
        module: "employees",
        action: "update",
        targetId: id,
        targetName: emp?.name ?? id,
        changes: Object.keys(changes).length > 0 ? changes : null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật nhân viên. Vui lòng thử lại.";
      set({ employees: prevEmployees, error: msg });
      toast.error(msg);
    }
  },

  deleteEmployee: async (id) => {
    if (!guardPermission("employees", "delete", (msg) => set({ error: msg }))) return;

    const prevEmployees = get().employees;
    const prevSelectedIds = get().selectedIds;

    // Optimistic: xóa khỏi state + selectedIds
    set({
      employees: prevEmployees.filter((e) => e.id !== id),
      selectedIds: prevSelectedIds.filter((sid) => sid !== id),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/employees/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Đã xóa nhân viên");

      // C2: Audit log — fire-and-forget
      const emp = prevEmployees.find((e) => e.id === id);
      logAudit({
        module: "employees",
        action: "delete",
        targetId: id,
        targetName: emp?.name ?? id,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể xóa nhân viên. Vui lòng thử lại.";
      set({ employees: prevEmployees, selectedIds: prevSelectedIds, error: msg });
      toast.error(msg);
    }
  },

  setFilter: (partial) => {
    set((state) => {
      // Nếu thay đổi bất kỳ field nào ngoại trừ `page` → reset page về 1
      const isPageOnly =
        Object.keys(partial).length === 1 && "page" in partial;
      const newPage = isPageOnly ? partial.page : 1;

      return {
        filter: {
          ...state.filter,
          ...partial,
          page: newPage ?? 1,
        },
      };
    });
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
  // BANK ACCOUNT ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchBankAccounts: async (employeeId) => {
    try {
      const res = await fetch(`${API_BASE}/bank-accounts?employeeId=${employeeId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BankAccount[] = await res.json();
      set({ bankAccounts: data });
    } catch {
      set({ bankAccounts: [] });
    }
  },

  addBankAccount: async (data) => {
    if (!guardPermission("employees", "create", (msg) => set({ error: msg }))) return;

    const now = nowISO();
    const newAccount: BankAccount = {
      ...data,
      accountHolder: data.accountHolder.toUpperCase(),
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    // If first account or marked primary, ensure exclusivity
    const prev = get().bankAccounts;
    const isFirst = prev.filter((a) => a.employeeId === data.employeeId).length === 0;
    if (isFirst) newAccount.isPrimary = true;

    // Optimistic
    let updatedList = [...prev];
    if (newAccount.isPrimary) {
      updatedList = updatedList.map((a) =>
        a.employeeId === data.employeeId ? { ...a, isPrimary: false } : a
      );
    }
    updatedList.push(newAccount);
    set({ bankAccounts: updatedList, error: null });

    try {
      // If setting primary, unset others on server
      if (newAccount.isPrimary) {
        for (const a of prev.filter((a) => a.employeeId === data.employeeId && a.isPrimary)) {
          await fetch(`${API_BASE}/bank-accounts/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPrimary: false, updatedAt: now }),
          });
        }
      }

      const res = await fetch(`${API_BASE}/bank-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Rollback
      set({ bankAccounts: prev, error: "Không thể thêm tài khoản ngân hàng. Vui lòng thử lại." });
    }
  },

  updateBankAccount: async (id, data) => {
    if (!guardPermission("employees", "update", (msg) => set({ error: msg }))) return;

    const prev = get().bankAccounts;
    const now = nowISO();
    const patchData = {
      ...data,
      ...(data.accountHolder ? { accountHolder: data.accountHolder.toUpperCase() } : {}),
      updatedAt: now,
    };

    set({
      bankAccounts: prev.map((a) => (a.id === id ? { ...a, ...patchData } : a)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/bank-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      set({ bankAccounts: prev, error: "Không thể cập nhật tài khoản. Vui lòng thử lại." });
    }
  },

  deleteBankAccount: async (id) => {
    if (!guardPermission("employees", "delete", (msg) => set({ error: msg }))) return;

    const prev = get().bankAccounts;
    const target = prev.find((a) => a.id === id);
    if (!target) return;

    // Không xóa isPrimary nếu còn TK khác
    const sameEmployee = prev.filter((a) => a.employeeId === target.employeeId);
    if (target.isPrimary && sameEmployee.length > 1) {
      set({ error: "Vui lòng đặt tài khoản khác làm mặc định trước khi xóa" });
      return;
    }

    // Optimistic
    set({ bankAccounts: prev.filter((a) => a.id !== id), error: null });

    try {
      const res = await fetch(`${API_BASE}/bank-accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      set({ bankAccounts: prev, error: "Không thể xóa tài khoản. Vui lòng thử lại." });
    }
  },

  setPrimaryAccount: async (id) => {
    if (!guardPermission("employees", "update", (msg) => set({ error: msg }))) return;

    const prev = get().bankAccounts;
    const target = prev.find((a) => a.id === id);
    if (!target || target.isPrimary) return;

    const now = nowISO();

    // Optimistic: unset all same employee, set target
    set({
      bankAccounts: prev.map((a) => {
        if (a.employeeId !== target.employeeId) return a;
        return a.id === id
          ? { ...a, isPrimary: true, updatedAt: now }
          : { ...a, isPrimary: false, updatedAt: now };
      }),
      error: null,
    });

    try {
      // Unset others
      const others = prev.filter((a) => a.employeeId === target.employeeId && a.id !== id && a.isPrimary);
      for (const a of others) {
        await fetch(`${API_BASE}/bank-accounts/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPrimary: false, updatedAt: now }),
        });
      }
      // Set target
      await fetch(`${API_BASE}/bank-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true, updatedAt: now }),
      });
    } catch {
      set({ bankAccounts: prev, error: "Không thể cập nhật tài khoản mặc định. Vui lòng thử lại." });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUALIFICATION ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchQualifications: async (employeeId) => {
    try {
      const res = await fetch(`${API_BASE}/qualifications?employeeId=${employeeId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Qualification[] = await res.json();
      set({ qualifications: data });
    } catch {
      set({ qualifications: [] });
    }
  },

  addQualification: async (data) => {
    if (!guardPermission("employees", "create", (msg) => set({ error: msg }))) return;

    const now = nowISO();
    const newQual: Qualification = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const prev = get().qualifications;
    set({ qualifications: [...prev, newQual], error: null });

    try {
      const res = await fetch(`${API_BASE}/qualifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQual),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      set({ qualifications: prev, error: "Không thể thêm bằng cấp. Vui lòng thử lại." });
    }
  },

  updateQualification: async (id, data) => {
    if (!guardPermission("employees", "update", (msg) => set({ error: msg }))) return;

    const prev = get().qualifications;
    const now = nowISO();
    const patchData = { ...data, updatedAt: now };

    set({
      qualifications: prev.map((q) => (q.id === id ? { ...q, ...patchData } : q)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/qualifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      set({ qualifications: prev, error: "Không thể cập nhật bằng cấp. Vui lòng thử lại." });
    }
  },

  deleteQualification: async (id) => {
    if (!guardPermission("employees", "delete", (msg) => set({ error: msg }))) return;

    const prev = get().qualifications;
    set({ qualifications: prev.filter((q) => q.id !== id), error: null });

    try {
      const res = await fetch(`${API_BASE}/qualifications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      set({ qualifications: prev, error: "Không thể xóa bằng cấp. Vui lòng thử lại." });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  filteredEmployees: () => {
    const { employees, filter } = get();
    let result = [...employees];

    // ── Search: case-insensitive trên name + email + phone ──
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.phone.includes(q)
      );
    }

    // ── Filter: department ──
    if (filter.departmentId) {
      result = result.filter((e) => e.department === filter.departmentId);
    }

    // ── Filter: branchId ──
    if (filter.branchId) {
      result = result.filter((e) => e.branchId === filter.branchId);
    }

    // ── Filter: status ──
    if (filter.status) {
      result = result.filter((e) => e.status === filter.status);
    }

    // ── Filter: salaryType ──
    if (filter.salaryType) {
      result = result.filter((e) => e.salaryType === filter.salaryType);
    }

    // ── Sort ──
    if (filter.sortBy) {
      const dir = filter.sortOrder === "desc" ? -1 : 1;
      result.sort((a, b) => {
        const fieldA = a[filter.sortBy!];
        const fieldB = b[filter.sortBy!];
        if (typeof fieldA === "string" && typeof fieldB === "string") {
          return fieldA.localeCompare(fieldB, "vi") * dir;
        }
        if (typeof fieldA === "number" && typeof fieldB === "number") {
          return (fieldA - fieldB) * dir;
        }
        return 0;
      });
    }

    return result;
  },

  paginatedEmployees: () => {
    const { filter } = get();
    const filtered = get().filteredEmployees();
    const start = (filter.page - 1) * filter.pageSize;
    return filtered.slice(start, start + filter.pageSize);
  },

  totalFiltered: () => {
    return get().filteredEmployees().length;
  },

  stats: () => {
    const { employees } = get();
    const total = employees.length;

    const counts: Record<EmployeeStatus, number> = {
      active: 0,
      inactive: 0,
      on_leave: 0,
      resigned: 0,
    };
    let salarySum = 0;

    for (const e of employees) {
      counts[e.status]++;
      salarySum += e.salary;
    }

    return {
      total,
      active: counts.active,
      inactive: counts.inactive,
      onLeave: counts.on_leave,
      resigned: counts.resigned,
      avgSalary: total > 0 ? Math.round(salarySum / total) : 0,
    };
  },

  // ── Backward-compat computed ──

  getActiveCount: () => {
    return get().employees.filter((e) => e.status === "active").length;
  },

  getCountByDepartment: () => {
    return get().employees.reduce<Record<string, number>>((acc, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1;
      return acc;
    }, {});
  },

  getCountByStatus: () => {
    return get().employees.reduce<Record<string, number>>((acc, emp) => {
      acc[emp.status] = (acc[emp.status] || 0) + 1;
      return acc;
    }, {});
  },
}));
