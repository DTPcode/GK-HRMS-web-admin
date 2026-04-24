// ============================================================================
// GK-HRMS — Employee Store (Zustand v5)
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { guardPermission } from "@/lib/guardPermission";
import type {
  Employee,
  EmployeeFormData,
  EmployeeFilter,
  EmployeeStatus,
} from "@/types/employee";

const API_BASE = "http://localhost:3001";

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
      id: `emp-${Date.now()}`,
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
    } catch (err) {
      // Rollback — xóa bản vừa thêm
      set({
        employees: prevEmployees,
        error:
          err instanceof Error
            ? err.message
            : "Không thể tạo nhân viên mới. Vui lòng thử lại.",
      });
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
    } catch (err) {
      // Rollback về bản cũ
      set({
        employees: prevEmployees,
        error:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật nhân viên. Vui lòng thử lại.",
      });
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
    } catch (err) {
      // Rollback — thêm lại NV đã xóa
      set({
        employees: prevEmployees,
        selectedIds: prevSelectedIds,
        error:
          err instanceof Error
            ? err.message
            : "Không thể xóa nhân viên. Vui lòng thử lại.",
      });
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
