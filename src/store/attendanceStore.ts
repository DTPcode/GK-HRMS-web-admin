// ============================================================================
// GK-HRMS — Attendance Store (Zustand v5)
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { API_BASE } from "@/lib/constants";
import { guardPermission } from "@/lib/guardPermission";
import type {
  AttendanceRecord,
  AttendanceFormData,
  LeaveRequest,
  ShiftAssignment,
  ShiftAssignmentFormData,
  MonthlySummaryRecord,
  MonthlySummaryRow,
} from "@/types/attendance";
import { HOLIDAYS_2026 } from "@/types/attendance";
import { useEmployeeStore } from "@/store/employeeStore";
import { BRANCH_LIST } from "@/types/employee";
import type { Employee } from "@/types/employee";



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

  /** Phân ca làm việc — fetch theo tháng */
  shiftAssignments: ShiftAssignment[];

  /** Tổng hợp bảng công tháng */
  monthlySummaries: MonthlySummaryRecord[];
  summaryLoading: boolean;

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

  // ── SHIFT ASSIGNMENT ACTIONS ──

  /** Fetch phân ca theo tháng — GET /shift-assignments, filter client-side */
  fetchShiftAssignments: (month: string) => Promise<void>;

  /** Phân ca / cập nhật ca — upsert (POST nếu mới, PATCH nếu đã có) */
  assignShift: (data: ShiftAssignmentFormData) => Promise<void>;

  /** Phân ca hàng loạt — dùng cho copy tuần trước */
  bulkAssignShifts: (assignments: ShiftAssignmentFormData[]) => Promise<void>;

  /** Xóa phân ca */
  deleteShiftAssignment: (id: string) => Promise<void>;

  // ── SHIFT COMPUTED ──

  /** Tìm phân ca cho 1 NV trong 1 ngày */
  getShiftByEmployeeDate: (employeeId: string, date: string) => ShiftAssignment | undefined;

  /** Lịch tuần: Record<employeeId, Record<date, ShiftAssignment>> */
  weeklySchedule: (weekStart: string) => Record<string, Record<string, ShiftAssignment>>;

  // ── MONTHLY SUMMARY ACTIONS ──

  /** Fetch tổng hợp đã lưu — GET /monthly-summaries?month=X */
  fetchMonthlySummaries: (month: string) => Promise<void>;

  /** Tổng hợp bảng công từ records + leaves + supplements */
  generateMonthlySummary: (month: string) => Promise<void>;

  /** Xác nhận tổng hợp 1 NV */
  confirmSummary: (employeeId: string, month: string) => Promise<void>;

  /** Xác nhận tất cả tổng hợp trong tháng */
  confirmAllSummaries: (month: string) => Promise<void>;

  // ── MONTHLY SUMMARY COMPUTED ──

  /** Tổng hợp theo tháng với thông tin NV đã join */
  summariesByMonth: (month: string) => MonthlySummaryRow[];
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
  shiftAssignments: [],
  monthlySummaries: [],
  summaryLoading: false,

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
      // M1: Đảm bảo employees đã load trước khi filter
      const { useAccountStore } = await import("@/store/accountStore");
      const { currentUser } = useAccountStore.getState();
      if (
        currentUser.role === "branch_manager" &&
        currentUser.branchId
      ) {
        const { useEmployeeStore } = await import("@/store/employeeStore");
        const empStore = useEmployeeStore.getState();
        if (empStore.employees.length === 0) await empStore.fetchEmployees();
        const branchEmployeeIds = new Set(
          useEmployeeStore.getState().employees
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
      id: crypto.randomUUID(),
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

    // Lock check: kỳ chấm công đã khóa → không cho duyệt
    const leave = get().leaveRequests.find((lr) => lr.id === leaveId);
    if (leave) {
      const month = leave.startDate.slice(0, 7);
      const { useSupplementStore } = await import("@/store/supplementStore");
      if (useSupplementStore.getState().isLocked("attendance_period", month)) {
        set({ error: `Kỳ chấm công tháng ${month} đã bị khóa. Không thể duyệt.` });
        return;
      }
    }

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

  // ═══════════════════════════════════════════════════════════════════════════
  // SHIFT ASSIGNMENT ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchShiftAssignments: async (month) => {
    try {
      const res = await fetch(`${API_BASE}/shift-assignments`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all: ShiftAssignment[] = await res.json();
      // Filter client-side by month (date starts with YYYY-MM)
      const filtered = all.filter((sa) => sa.date.startsWith(month));
      set({ shiftAssignments: filtered });
    } catch {
      set({ shiftAssignments: [] });
    }
  },

  assignShift: async (data) => {
    if (!guardPermission("attendance", "create", (msg) => set({ error: msg }))) return;

    const now = nowISO();
    const prev = get().shiftAssignments;

    // Get current user for assignedBy + branchId
    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();
    if (!currentUser) return;

    // Check existing
    const existing = prev.find(
      (sa) => sa.employeeId === data.employeeId && sa.date === data.date
    );

    if (existing) {
      // PATCH update
      const patchData = { shiftType: data.shiftType, note: data.note, updatedAt: now };
      set({
        shiftAssignments: prev.map((sa) =>
          sa.id === existing.id ? { ...sa, ...patchData } : sa
        ),
        error: null,
      });
      try {
        const res = await fetch(`${API_BASE}/shift-assignments/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchData),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        set({ shiftAssignments: prev, error: "Không thể cập nhật phân ca." });
      }
    } else {
      // POST new
      const newSA: ShiftAssignment = {
        id: crypto.randomUUID(),
        employeeId: data.employeeId,
        branchId: currentUser.branchId ?? "branch-01",
        date: data.date,
        shiftType: data.shiftType,
        assignedBy: currentUser.id,
        note: data.note,
        createdAt: now,
        updatedAt: now,
      };
      set({ shiftAssignments: [...prev, newSA], error: null });
      try {
        const res = await fetch(`${API_BASE}/shift-assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSA),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        set({ shiftAssignments: prev, error: "Không thể phân ca." });
      }
    }
  },

  bulkAssignShifts: async (assignments) => {
    if (!guardPermission("attendance", "create", (msg) => set({ error: msg }))) return;

    const results = await Promise.allSettled(
      assignments.map((a) => get().assignShift(a))
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      set({ error: `${failed}/${assignments.length} phân ca thất bại` });
    }
  },

  deleteShiftAssignment: async (id) => {
    if (!guardPermission("attendance", "delete", (msg) => set({ error: msg }))) return;

    const prev = get().shiftAssignments;
    set({ shiftAssignments: prev.filter((sa) => sa.id !== id), error: null });

    try {
      const res = await fetch(`${API_BASE}/shift-assignments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      set({ shiftAssignments: prev, error: "Không thể xóa phân ca." });
    }
  },

  // ── Shift Computed ──

  getShiftByEmployeeDate: (employeeId, date) => {
    return get().shiftAssignments.find(
      (sa) => sa.employeeId === employeeId && sa.date === date
    );
  },

  weeklySchedule: (weekStart) => {
    const start = new Date(weekStart);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    const result: Record<string, Record<string, ShiftAssignment>> = {};
    for (const sa of get().shiftAssignments) {
      if (dates.includes(sa.date)) {
        if (!result[sa.employeeId]) result[sa.employeeId] = {};
        result[sa.employeeId][sa.date] = sa;
      }
    }
    return result;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MONTHLY SUMMARY ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchMonthlySummaries: async (month) => {
    try {
      const res = await fetch(`${API_BASE}/monthly-summaries?month=${month}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MonthlySummaryRecord[] = await res.json();
      set({ monthlySummaries: data });
    } catch {
      set({ monthlySummaries: [] });
    }
  },

  generateMonthlySummary: async (month) => {
    if (!guardPermission("attendance", "create", (msg) => set({ error: msg }))) return;

    // Check lock
    const { useSupplementStore } = await import("@/store/supplementStore");
    const suppState = useSupplementStore.getState();
    if (suppState.isLocked("attendance_period", month)) {
      set({ error: "Kỳ công đã khóa. Không thể tổng hợp lại." });
      return;
    }

    set({ summaryLoading: true, error: null });

    try {
      const { records, leaveRequests } = get();
      const { useEmployeeStore } = await import("@/store/employeeStore");
      const employees = useEmployeeStore.getState().employees;

      // Supplements
      const supplements = suppState.supplements ?? [];
      const approvedSupplements = supplements.filter(
        (s) => s.status === "approved" && s.date.startsWith(month)
      );

      // Standard work days calculation
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr);
      const mon = parseInt(monthStr);
      const daysInMonth = new Date(year, mon, 0).getDate();
      let standardWorkDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${month}-${String(d).padStart(2, "0")}`;
        const dayOfWeek = new Date(dateStr).getDay();
        // Skip weekends and holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS_2026.includes(dateStr)) {
          standardWorkDays++;
        }
      }

      const totalHolidayDays = HOLIDAYS_2026.filter((h) => h.startsWith(month)).length;
      const now = nowISO();

      // Build summaries per employee
      const activeEmps = employees.filter((e) => e.status === "active" || e.status === "on_leave");
      const summaries: MonthlySummaryRecord[] = activeEmps.map((emp) => {
        const empRecords = records.filter(
          (r) => r.employeeId === emp.id && r.date.startsWith(month)
        );
        const empLeaves = leaveRequests.filter(
          (l) => l.employeeId === emp.id && l.status === "approved" && l.startDate.startsWith(month)
        );
        const empSupps = approvedSupplements.filter((s) => s.employeeId === emp.id);

        let totalWorkDays = 0;
        let totalLateDays = 0;
        let totalLateMinutes = 0;
        let totalAbsentDays = 0;
        let totalOvertimeHours = 0;

        for (const r of empRecords) {
          if (r.status === "present" || r.status === "late") totalWorkDays++;
          if (r.status === "late") {
            totalLateDays++;
            totalLateMinutes += r.lateMinutes;
          }
          if (r.status === "absent") totalAbsentDays++;
          totalOvertimeHours += r.overtimeHours;
        }

        // Leave days
        let totalLeaveDays = 0;
        for (const l of empLeaves) {
          totalLeaveDays += l.totalDays;
        }

        // Supplements: add OT hours from overtime_request
        for (const s of empSupps) {
          if (s.type === "overtime_request" && s.requestedCheckIn && s.requestedCheckOut) {
            // Rough OT calc: parse HH:mm diff
            const [hIn, mIn] = s.requestedCheckIn.split(":").map(Number);
            const [hOut, mOut] = s.requestedCheckOut.split(":").map(Number);
            const otHours = (hOut * 60 + mOut - hIn * 60 - mIn) / 60;
            if (otHours > 0) totalOvertimeHours += otHours;
          }
        }

        return {
          id: `ms-${emp.id}-${month}`,
          employeeId: emp.id,
          employeeName: emp.name,
          month,
          totalWorkDays,
          totalLateDays,
          totalLateMinutes,
          totalAbsentDays,
          totalLeaveDays,
          totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
          totalHolidayDays,
          standardWorkDays,
          status: "draft" as const,
          createdAt: now,
          updatedAt: now,
        };
      });

      // M5: Delete existing + POST all — parallel thay vì sequential
      const existingRes = await fetch(`${API_BASE}/monthly-summaries?month=${month}`);
      if (existingRes.ok) {
        const existing: MonthlySummaryRecord[] = await existingRes.json();
        await Promise.all(
          existing.map((e) =>
            fetch(`${API_BASE}/monthly-summaries/${e.id}`, { method: "DELETE" })
          )
        );
      }

      await Promise.all(
        summaries.map((s) =>
          fetch(`${API_BASE}/monthly-summaries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(s),
          })
        )
      );

      set({ monthlySummaries: summaries, summaryLoading: false });
    } catch {
      set({ summaryLoading: false, error: "Không thể tổng hợp bảng công." });
    }
  },

  confirmSummary: async (employeeId, month) => {
    if (!guardPermission("attendance", "update", (msg) => set({ error: msg }))) return;

    const { useSupplementStore } = await import("@/store/supplementStore");
    if (useSupplementStore.getState().isLocked("attendance_period", month)) {
      set({ error: "Kỳ công đã khóa." });
      return;
    }

    const prev = get().monthlySummaries;
    const target = prev.find((s) => s.employeeId === employeeId && s.month === month);
    if (!target || target.status !== "draft") return;

    const now = nowISO();
    set({
      monthlySummaries: prev.map((s) =>
        s.id === target.id ? { ...s, status: "confirmed" as const, updatedAt: now } : s
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/monthly-summaries/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed", updatedAt: now }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      set({ monthlySummaries: prev, error: "Không thể xác nhận." });
    }
  },

  confirmAllSummaries: async (month) => {
    if (!guardPermission("attendance", "update", (msg) => set({ error: msg }))) return;

    const drafts = get().monthlySummaries.filter(
      (s) => s.month === month && s.status === "draft"
    );
    for (const s of drafts) {
      await get().confirmSummary(s.employeeId, month);
    }
  },

  // ── Monthly Summary Computed ──

  summariesByMonth: (month) => {
    const employees = useEmployeeStore.getState().employees;

    return get()
      .monthlySummaries.filter((s) => s.month === month)
      .map((s): MonthlySummaryRow => {
        const emp = employees.find((e: Employee) => e.id === s.employeeId);
        const branch = BRANCH_LIST.find((b) => b.id === emp?.branchId);
        return {
          ...s,
          department: emp?.department ?? "",
          branchName: branch?.name ?? "",
        };
      })
      .sort((a, b) => a.department.localeCompare(b.department) || a.employeeName.localeCompare(b.employeeName));
  },
}));
