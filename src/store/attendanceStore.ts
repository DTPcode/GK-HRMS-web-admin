// ============================================================================
// GK-HRMS — Attendance Store (Zustand v5)
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { guardPermission } from "@/lib/guardPermission";
import type {
  AttendanceRecord,
  AttendanceFormData,
  LeaveRequest,
} from "@/types/attendance";

const API_BASE = "http://localhost:3001";

// ---------------------------------------------------------------------------
// Monthly Summary Interface
// ---------------------------------------------------------------------------

/** Tổng hợp chấm công 1 NV trong 1 tháng */
interface MonthlySummary {
  employeeId: string;
  totalWorkDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  totalOvertimeHours: number;
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface AttendanceState {
  // ── STATE ──
  records: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  loading: boolean;
  error: string | null;
  /** Tháng đang xem — format "YYYY-MM" */
  selectedMonth: string;
  selectedIds: string[];

  // ── ACTIONS ──

  /**
   * Fetch chấm công từ json-server.
   * Side-effects: set loading → GET /attendance → set records.
   */
  fetchAttendance: () => Promise<void>;

  /**
   * Thêm bản ghi chấm công — optimistic update.
   * @param data — payload từ form (không có id)
   */
  addAttendance: (data: AttendanceFormData) => Promise<void>;

  /**
   * Cập nhật chấm công — PATCH.
   * @param id — attendance record ID
   * @param data — fields cần cập nhật
   */
  updateAttendance: (id: string, data: Partial<AttendanceFormData>) => Promise<void>;

  /**
   * Xóa chấm công — optimistic update.
   * @param id — attendance record ID
   */
  deleteAttendance: (id: string) => Promise<void>;

  /**
   * Fetch danh sách đơn nghỉ phép.
   * Side-effects: GET /leaves → set leaveRequests.
   */
  fetchLeaveRequests: () => Promise<void>;

  /**
   * Duyệt đơn nghỉ phép.
   * Side-effects: PATCH /leaves/:id → status = "approved", set approvedBy.
   * @param leaveId — ID đơn nghỉ
   */
  approveLeave: (leaveId: string) => Promise<void>;

  /**
   * Từ chối đơn nghỉ phép.
   * Side-effects: PATCH /leaves/:id → status = "rejected".
   * @param leaveId — ID đơn nghỉ
   * @param reason — lý do từ chối (ghi vào note/reason)
   */
  rejectLeave: (leaveId: string, reason: string) => Promise<void>;

  /**
   * Duyệt hàng loạt đơn nghỉ phép.
   * Side-effects: PATCH từng leave → status = "approved".
   * @param leaveIds — danh sách ID cần duyệt
   */
  bulkApprove: (leaveIds: string[]) => Promise<void>;

  /** Backward-compat: alias cho approveLeave/rejectLeave */
  updateLeaveStatus: (id: string, status: "approved" | "rejected", approverId: string) => Promise<void>;

  setSelectedMonth: (month: string) => void;
  toggleSelectId: (id: string) => void;
  clearSelection: () => void;

  // ── COMPUTED ──

  /**
   * Tổng hợp chấm công tháng cho 1 nhân viên.
   * @param empId — employee ID
   * @returns MonthlySummary hoặc null nếu không có data
   */
  monthlySummary: (empId: string) => MonthlySummary | null;

  /**
   * Đơn nghỉ phép chờ duyệt — sort theo ngày tạo (cũ nhất trước).
   * Dùng cho: LeaveRequestTable, Dashboard notification badge.
   */
  pendingLeaves: () => LeaveRequest[];

  /** Số đơn chờ duyệt — dùng cho badge */
  getPendingLeaveCount: () => number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowISO = () => new Date().toISOString();

/** Default tháng hiện tại "YYYY-MM" */
const currentMonth = () => new Date().toISOString().slice(0, 7);

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  records: [],
  leaveRequests: [],
  loading: false,
  error: null,
  selectedMonth: currentMonth(),
  selectedIds: [],

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchAttendance: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/attendance`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data: AttendanceRecord[] = await res.json();

      // DATA FILTER: branch_manager chỉ thấy chấm công chi nhánh mình
      // Cross-reference employeeStore để lấy danh sách employeeId thuộc chi nhánh
      // TODO: Replace với server-side filtering khi backend sẵn
      const { useAccountStore } = await import("@/store/accountStore");
      const { currentUser } = useAccountStore.getState();
      if (
        currentUser.role === "branch_manager" &&
        currentUser.branchId
      ) {
        const { useEmployeeStore } = await import("@/store/employeeStore");
        const employees = useEmployeeStore.getState().employees;
        const branchEmployeeIds = new Set(
          employees
            .filter((e) => e.branchId === currentUser.branchId)
            .map((e) => e.id)
        );
        data = data.filter((r) => branchEmployeeIds.has(r.employeeId));
      }

      set({ records: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu chấm công. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  addAttendance: async (data) => {
    if (!guardPermission("attendance", "create", (msg) => set({ error: msg }))) return;

    const newRecord: AttendanceRecord = {
      ...data,
      id: `att-${Date.now()}`,
    };

    const prev = get().records;
    set({ records: [...prev, newRecord], error: null });

    try {
      const res = await fetch(`${API_BASE}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        records: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể thêm chấm công. Vui lòng thử lại.",
      });
    }
  },

  updateAttendance: async (id, data) => {
    if (!guardPermission("attendance", "update", (msg) => set({ error: msg }))) return;

    const prev = get().records;

    set({
      records: prev.map((r) => (r.id === id ? { ...r, ...data } : r)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        records: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật chấm công. Vui lòng thử lại.",
      });
    }
  },

  deleteAttendance: async (id) => {
    if (!guardPermission("attendance", "delete", (msg) => set({ error: msg }))) return;

    const prev = get().records;
    const prevIds = get().selectedIds;

    set({
      records: prev.filter((r) => r.id !== id),
      selectedIds: prevIds.filter((sid) => sid !== id),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/attendance/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        records: prev,
        selectedIds: prevIds,
        error:
          err instanceof Error
            ? err.message
            : "Không thể xóa chấm công. Vui lòng thử lại.",
      });
    }
  },

  fetchLeaveRequests: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/leaves`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LeaveRequest[] = await res.json();
      set({ leaveRequests: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải đơn nghỉ phép. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  approveLeave: async (leaveId) => {
    if (!guardPermission("attendance", "approve", (msg) => set({ error: msg }))) return;

    const prev = get().leaveRequests;

    set({
      leaveRequests: prev.map((lr) =>
        lr.id === leaveId ? { ...lr, status: "approved" as const } : lr
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/leaves/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        leaveRequests: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể duyệt đơn nghỉ phép. Vui lòng thử lại.",
      });
    }
  },

  rejectLeave: async (leaveId, reason) => {
    if (!guardPermission("attendance", "approve", (msg) => set({ error: msg }))) return;

    const prev = get().leaveRequests;

    set({
      leaveRequests: prev.map((lr) =>
        lr.id === leaveId
          ? { ...lr, status: "rejected" as const, reason }
          : lr
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/leaves/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reason }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        leaveRequests: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể từ chối đơn nghỉ phép. Vui lòng thử lại.",
      });
    }
  },

  bulkApprove: async (leaveIds) => {
    if (!guardPermission("attendance", "approve", (msg) => set({ error: msg }))) return;

    const prev = get().leaveRequests;

    set({
      leaveRequests: prev.map((lr) =>
        leaveIds.includes(lr.id)
          ? { ...lr, status: "approved" as const }
          : lr
      ),
      error: null,
    });

    try {
      // json-server: PATCH từng request
      await Promise.all(
        leaveIds.map((id) =>
          fetch(`${API_BASE}/leaves/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" }),
          })
        )
      );
    } catch (err) {
      set({
        leaveRequests: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể duyệt hàng loạt. Vui lòng thử lại.",
      });
    }
  },

  // Backward-compat
  updateLeaveStatus: async (id, status, approverId) => {
    const prev = get().leaveRequests;

    set({
      leaveRequests: prev.map((lr) =>
        lr.id === id ? { ...lr, status, approvedBy: approverId } : lr
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, approvedBy: approverId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        leaveRequests: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái đơn nghỉ. Vui lòng thử lại.",
      });
    }
  },

  setSelectedMonth: (month) => {
    set({ selectedMonth: month });
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

  monthlySummary: (empId) => {
    const { records, selectedMonth } = get();
    const monthRecords = records.filter(
      (r) => r.employeeId === empId && r.date.startsWith(selectedMonth)
    );

    if (monthRecords.length === 0) return null;

    const summary: MonthlySummary = {
      employeeId: empId,
      totalWorkDays: monthRecords.length,
      presentDays: 0,
      lateDays: 0,
      absentDays: 0,
      leaveDays: 0,
      holidayDays: 0,
      totalOvertimeHours: 0,
    };

    for (const r of monthRecords) {
      switch (r.status) {
        case "present":
          summary.presentDays++;
          break;
        case "late":
          summary.lateDays++;
          summary.presentDays++; // late vẫn tính ngày công
          break;
        case "absent":
          summary.absentDays++;
          break;
        case "leave":
          summary.leaveDays++;
          break;
        case "holiday":
          summary.holidayDays++;
          break;
      }
      summary.totalOvertimeHours += r.overtimeHours;
    }

    return summary;
  },

  pendingLeaves: () => {
    return get()
      .leaveRequests.filter((lr) => lr.status === "pending")
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  },

  getPendingLeaveCount: () => {
    return get().leaveRequests.filter((lr) => lr.status === "pending").length;
  },
}));
