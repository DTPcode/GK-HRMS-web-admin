// ============================================================================
// GK-HRMS — Payroll Store (Zustand v5)
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// Cross-store: dùng getState() để truy cập employee, contract, attendance
// ============================================================================

import { create } from "zustand";
import { guardPermission } from "@/lib/guardPermission";
import type {
  PayrollRecord,
  PayrollStatus,
  PayrollSummary,
  PaymentData,
} from "@/types/payroll";
import { useEmployeeStore } from "@/store/employeeStore";
import { useContractStore } from "@/store/contractStore";
import { useAttendanceStore } from "@/store/attendanceStore";

const API_BASE = "http://localhost:3001";

// ---------------------------------------------------------------------------
// Payroll Calculation Constants — theo luật Lao động VN
// ---------------------------------------------------------------------------

/** Tỷ lệ đóng BHXH người lao động trên lương cơ bản (8%) */
const BHXH_RATE = 0.08;
/** Tỷ lệ đóng BHYT người lao động (1.5%) */
const BHYT_RATE = 0.015;
/** Tỷ lệ đóng BHTN người lao động (1%) */
const BHTN_RATE = 0.01;
/** Hệ số lương OT ngày thường (150%) */
const OT_MULTIPLIER = 1.5;
/** Số giờ chuẩn 1 ngày công */
const STANDARD_HOURS_PER_DAY = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowISO = () => new Date().toISOString();

/** Tính tổng từ Record<string, number> */
function sumRecord(rec: Record<string, number>): number {
  return Object.values(rec).reduce((s, v) => s + v, 0);
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface PayrollState {
  // ── STATE ──
  records: PayrollRecord[];
  loading: boolean;
  error: string | null;
  /** Tháng đang xem — format "YYYY-MM" */
  selectedMonth: string;
  selectedIds: string[];

  // ── ACTIONS ──

  /**
   * Fetch bảng lương từ json-server.
   * Side-effects: set loading → GET /payroll → set records.
   */
  fetchPayroll: () => Promise<void>;

  /**
   * Tạo bảng lương draft cho tháng chỉ định.
   * Side-effects: POST /payroll/generate (hoặc POST /payroll cho từng NV).
   * Tạo draft record cho tất cả NV active tháng đó.
   * @param month — kỳ lương "YYYY-MM"
   */
  generatePayroll: (month: string) => Promise<void>;

  /**
   * Cập nhật bản ghi lương — PATCH.
   * @param id — payroll record ID
   * @param data — fields cần cập nhật
   */
  updatePayroll: (id: string, data: Partial<PayrollRecord>) => Promise<void>;

  /**
   * Gửi duyệt bảng lương → status = "pending_approval".
   * Side-effects: PATCH /payroll/:id
   * @param id — payroll record ID
   */
  submitForApproval: (id: string) => Promise<void>;

  /**
   * Từ chối bảng lương → quay về status = "draft".
   * Cho phép trả lại record từ pending_approval hoặc approved để HR sửa lại.
   * @param id — payroll record ID
   */
  rejectPayroll: (id: string) => Promise<void>;

  /**
   * Duyệt bảng lương → status = "approved".
   * Side-effects: PATCH /payroll/:id → set approvedBy.
   * @param id — payroll record ID
   */
  approvePayroll: (id: string) => Promise<void>;

  /**
   * Đánh dấu đã chi lương → status = "paid".
   * Side-effects: PATCH /payroll/:id → paidAt = now.
   * @param id — payroll record ID
   * @param paymentData — thông tin thanh toán từ ConfirmPaymentDialog
   */
  markAsPaid: (id: string, paymentData?: PaymentData) => Promise<void>;

  /**
   * Xuất bảng lương tháng → trigger download CSV.
   * Side-effects: tạo CSV blob → download file.
   * @param month — kỳ lương "YYYY-MM"
   */
  exportPayroll: (month: string) => void;

  /** Backward-compat alias */
  calculatePayroll: (month: string) => Promise<void>;

  setSelectedMonth: (month: string) => void;
  toggleSelectId: (id: string) => void;
  clearSelection: () => void;

  /**
   * Chuyển trạng thái cả tháng sang bước tiếp theo.
   * draft → pending_approval → approved → paid
   * Tất cả records trong tháng phải cùng trạng thái.
   */
  advanceMonthStatus: (month: string) => Promise<void>;

  // ── COMPUTED ──

  /**
   * Tổng hợp bảng lương theo tháng đang chọn.
   * Dùng cho Dashboard, SalarySummaryTable.
   */
  payrollSummary: () => PayrollSummary | null;

  /** Backward-compat alias cho payrollSummary */
  getSummary: () => PayrollSummary | null;

  /** Tổng thực lĩnh toàn kỳ */
  getTotalNetSalary: () => number;
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const usePayrollStore = create<PayrollState>((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  records: [],
  loading: false,
  error: null,
  selectedMonth: new Date().toISOString().slice(0, 7),
  selectedIds: [],

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchPayroll: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/payroll`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data: PayrollRecord[] = await res.json();

      // DATA FILTER: branch_manager chỉ thấy lương chi nhánh mình
      // TODO: Replace với server-side filtering khi backend sẵn
      const { useAccountStore } = await import("@/store/accountStore");
      const { currentUser } = useAccountStore.getState();
      if (currentUser.role === "branch_manager" && currentUser.branchId) {
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
            : "Không thể tải bảng lương. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  generatePayroll: async (month) => {
    if (!guardPermission("payroll", "create", (msg) => set({ error: msg }))) return;

    // ── Guard: check trạng thái bảng lương hiện tại ──
    const existing = get().records.filter((r) => r.month === month);
    const hasLockedRecords = existing.some(
      (r) => r.status === "approved" || r.status === "paid"
    );

    if (hasLockedRecords) {
      set({
        error: `Tháng ${month} đã có bảng lương được duyệt/chi. Không thể tính lại.`,
      });
      return;
    }

    // Nếu có draft/pending → xóa cũ trước khi tạo mới (tính lại)
    if (existing.length > 0) {
      for (const old of existing) {
        try {
          await fetch(`${API_BASE}/payroll/${old.id}`, { method: "DELETE" });
        } catch {
          // ignore delete errors for json-server
        }
      }
      // Xóa khỏi state
      set({
        records: get().records.filter((r) => r.month !== month),
      });
    }

    set({ loading: true, error: null });
    try {
      const now = nowISO();

      // ── Cross-store: lấy data từ employee, contract, attendance ──
      const activeEmployees = useEmployeeStore
        .getState()
        .employees.filter((e) => e.status === "active");

      const allContracts = useContractStore.getState().contracts;
      const allAttendance = useAttendanceStore.getState().records;

      if (activeEmployees.length === 0) {
        set({
          error: "Không có nhân viên nào đang hoạt động để tính lương.",
          loading: false,
        });
        return;
      }

      // ── Tính số ngày chuẩn trong tháng (trừ T7, CN) ──
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      let standardWorkDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(year, monthNum - 1, d).getDay();
        if (dow !== 0 && dow !== 6) standardWorkDays++;
      }

      // ── Tạo bảng lương cho từng NV ──
      const newRecords: PayrollRecord[] = [];

      for (const emp of activeEmployees) {
        // 1. Tìm HĐ active → baseSalary + allowances
        const activeContract = allContracts.find(
          (c) => c.employeeId === emp.id && c.status === "active"
        );
        const baseSalary = activeContract?.baseSalary ?? emp.salary ?? 0;
        const contractAllowances = activeContract?.allowances ?? 0;

        // 2. Chấm công tháng → ngày công thực tế + giờ OT
        const monthAttendance = allAttendance.filter(
          (r) => r.employeeId === emp.id && r.date.startsWith(month)
        );

        let actualWorkDays = 0;
        let totalOvertimeHours = 0;
        let totalLateMinutes = 0;

        for (const att of monthAttendance) {
          // present + late đều tính ngày công
          if (att.status === "present" || att.status === "late") {
            actualWorkDays++;
          }
          totalOvertimeHours += att.overtimeHours;
          totalLateMinutes += att.lateMinutes;
        }

        // Nếu không có chấm công → mặc định = standardWorkDays (NV mới)
        if (monthAttendance.length === 0) {
          actualWorkDays = standardWorkDays;
        }

        // 3. Tính lương theo ngày công thực tế
        const dailyRate = baseSalary / standardWorkDays;
        const proportionalSalary = Math.round(dailyRate * actualWorkDays);

        // 4. Phụ cấp — chia nhỏ (ước lượng từ tổng phụ cấp HĐ)
        const allowances: Record<string, number> = {};
        if (contractAllowances > 0) {
          // Tách phụ cấp thành các khoản phổ biến F&B
          allowances["com"] = Math.round(contractAllowances * 0.4);       // 40% cơm
          allowances["xe"] = Math.round(contractAllowances * 0.3);        // 30% xăng xe
          allowances["dien_thoai"] = contractAllowances - allowances["com"] - allowances["xe"]; // còn lại
        }
        const totalAllowances = sumRecord(allowances);

        // 5. Lương OT: hourlyRate × OT_MULTIPLIER × hours
        const hourlyRate = baseSalary / (standardWorkDays * STANDARD_HOURS_PER_DAY);
        const overtimePay = Math.round(
          hourlyRate * OT_MULTIPLIER * totalOvertimeHours
        );

        // 6. Phạt đi muộn: 20.000đ / 10 phút muộn (quy tắc nội bộ)
        const penalty = Math.round(Math.floor(totalLateMinutes / 10) * 20_000);

        // 7. Khấu trừ bảo hiểm — tính trên lương cơ bản
        const deductions: Record<string, number> = {
          BHXH: Math.round(baseSalary * BHXH_RATE),
          BHYT: Math.round(baseSalary * BHYT_RATE),
          BHTN: Math.round(baseSalary * BHTN_RATE),
        };
        const totalDeductions = sumRecord(deductions);

        // 8. Gross = proportionalSalary + allowances + OT - penalty
        const bonus = 0; // chưa có data → HR điều chỉnh sau
        const grossSalary =
          proportionalSalary + totalAllowances + bonus + overtimePay - penalty;

        // 9. Net = Gross - Deductions
        const netSalary = Math.max(0, grossSalary - totalDeductions);

        const record: PayrollRecord = {
          id: `pay-${Date.now()}-${emp.id}`,
          employeeId: emp.id,
          month,
          baseSalary,
          allowances,
          deductions,
          bonus,
          penalty,
          totalWorkDays: standardWorkDays,
          actualWorkDays,
          overtimeHours: totalOvertimeHours,
          overtimePay,
          grossSalary,
          netSalary,
          status: "draft",
          approvedBy: null,
          paidAt: null,
          note: `Tự động tính lương tháng ${month}`,
          createdAt: now,
          updatedAt: now,
        };

        newRecords.push(record);
      }

      // ── POST lên json-server (tuần tự để tránh race condition) ──
      for (const record of newRecords) {
        const res = await fetch(`${API_BASE}/payroll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }

      // ── Cập nhật state ──
      set((state) => ({
        records: [...state.records, ...newRecords],
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tạo bảng lương. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  updatePayroll: async (id, data) => {
    const prev = get().records;
    const patchData = { ...data, updatedAt: nowISO() };

    set({
      records: prev.map((r) => (r.id === id ? { ...r, ...patchData } : r)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        records: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật bảng lương. Vui lòng thử lại.",
      });
    }
  },

  submitForApproval: async (id) => {
    if (!guardPermission("payroll", "update", (msg) => set({ error: msg }))) return;

    const prev = get().records;
    const now = nowISO();

    set({
      records: prev.map((r) =>
        r.id === id
          ? { ...r, status: "pending_approval" as PayrollStatus, updatedAt: now }
          : r
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending_approval", updatedAt: now }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        records: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể gửi duyệt bảng lương. Vui lòng thử lại.",
      });
    }
  },

  rejectPayroll: async (id) => {
    if (!guardPermission("payroll", "approve", (msg) => set({ error: msg }))) return;

    const prev = get().records;
    const now = nowISO();

    // Optimistic: quay về draft, xóa approvedBy
    set({
      records: prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "draft" as PayrollStatus,
              approvedBy: null,
              updatedAt: now,
            }
          : r
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "draft",
          approvedBy: null,
          updatedAt: now,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        records: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể từ chối bảng lương. Vui lòng thử lại.",
      });
    }
  },

  approvePayroll: async (id) => {
    if (!guardPermission("payroll", "approve", (msg) => set({ error: msg }))) return;

    const prev = get().records;
    const now = nowISO();

    set({
      records: prev.map((r) =>
        r.id === id
          ? { ...r, status: "approved" as PayrollStatus, updatedAt: now }
          : r
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved", updatedAt: now }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        records: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể duyệt bảng lương. Vui lòng thử lại.",
      });
    }
  },

  markAsPaid: async (id, paymentData) => {
    if (!guardPermission("payroll", "approve", (msg) => set({ error: msg }))) return;

    const prev = get().records;
    const now = nowISO();

    const patchData = {
      status: "paid" as PayrollStatus,
      paidAt: paymentData?.paidAt ?? now,
      note: paymentData?.note,
      updatedAt: now,
    };

    set({
      records: prev.map((r) =>
        r.id === id ? { ...r, ...patchData } : r
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        records: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể đánh dấu đã chi lương. Vui lòng thử lại.",
      });
    }
  },

  exportPayroll: (month) => {
    const records = get().records.filter((r) => r.month === month);
    if (records.length === 0) return;

    const headers = [
      "Mã NV", "Kỳ lương", "Lương cơ bản", "Phụ cấp", "Thưởng",
      "Phạt", "Tổng thu nhập", "Khấu trừ", "Thực lĩnh", "Trạng thái",
    ].join(",");

    const rows = records.map((r) =>
      [
        r.employeeId, r.month, r.baseSalary, sumRecord(r.allowances),
        r.bonus, r.penalty, r.grossSalary, sumRecord(r.deductions),
        r.netSalary, r.status,
      ].join(",")
    );

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bang-luong-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Backward-compat
  calculatePayroll: async (month) => {
    await get().generatePayroll(month);
  },

  setSelectedMonth: (month) => {
    set({ selectedMonth: month });
  },

  advanceMonthStatus: async (month) => {
    const monthRecords = get().records.filter((r) => r.month === month);
    if (monthRecords.length === 0) return;

    // Workflow map: current → next
    const NEXT_STATUS: Record<string, PayrollStatus | null> = {
      draft: "pending_approval",
      pending_approval: "approved",
      approved: "paid",
      paid: null,
    };

    // Lấy trạng thái thấp nhất (để chuyển cả batch)
    const currentStatus = monthRecords[0].status;
    const nextStatus = NEXT_STATUS[currentStatus];

    if (!nextStatus) {
      set({ error: "Bảng lương đã ở trạng thái cuối cùng." });
      return;
    }

    const now = nowISO();
    const prev = get().records;

    // Optimistic update
    const patchFields: Partial<PayrollRecord> = {
      status: nextStatus,
      updatedAt: now,
    };
    // Nếu chuyển sang approved → set approvedBy
    if (nextStatus === "approved") {
      patchFields.approvedBy = "admin";
    }
    // Nếu chuyển sang paid → set paidAt
    if (nextStatus === "paid") {
      patchFields.paidAt = now;
    }

    set({
      records: prev.map((r) =>
        r.month === month ? { ...r, ...patchFields } : r
      ),
      error: null,
    });

    // PATCH từng record lên json-server
    try {
      for (const rec of monthRecords) {
        const res = await fetch(`${API_BASE}/payroll/${rec.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchFields),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      // Rollback
      set({
        records: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái. Vui lòng thử lại.",
      });
    }
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

  payrollSummary: () => {
    const { records, selectedMonth } = get();
    const monthRecords = records.filter((r) => r.month === selectedMonth);

    if (monthRecords.length === 0) return null;

    let totalGross = 0;
    let totalNet = 0;
    let totalOvertime = 0;

    for (const r of monthRecords) {
      totalGross += r.grossSalary;
      totalNet += r.netSalary;
      totalOvertime += r.overtimePay;
    }

    return {
      month: selectedMonth,
      totalEmployees: monthRecords.length,
      totalGross,
      totalNet,
      totalOvertime,
      byDepartment: {}, // TODO: cần join với employee data để group theo department
    };
  },

  // Backward-compat
  getSummary: () => {
    return get().payrollSummary();
  },

  getTotalNetSalary: () => {
    return get().records.reduce((sum, r) => sum + r.netSalary, 0);
  },
}));
