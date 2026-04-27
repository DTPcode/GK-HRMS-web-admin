// ============================================================================
// GK-HRMS — Supplement Store (Zustand v5)
// Dùng chung cho: AttendanceSupplement, AuditLog, DataLock
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { API_BASE } from "@/lib/constants";
import { guardPermission } from "@/lib/guardPermission";
import type {
  AttendanceSupplement,
  AttendanceSupplementFormData,
  AuditLog,
  AuditLogFilter,
  AuditAction,
  AuditModule,
  DataLock,
  LockType,
} from "@/types/supplement";



// ---------------------------------------------------------------------------
// Helper — ISO timestamp
// ---------------------------------------------------------------------------

const nowISO = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface SupplementState {
  // ── STATE ──
  supplements: AttendanceSupplement[];
  auditLogs: AuditLog[];
  dataLocks: DataLock[];
  loading: boolean;
  error: string | null;

  // ── ACTIONS — Attendance Supplement ──

  /**
   * Fetch yêu cầu bổ sung công.
   * @param month — "YYYY-MM" — nếu có, filter theo date prefix
   */
  fetchSupplements: (month?: string) => Promise<void>;

  /**
   * Tạo yêu cầu bổ sung công mới — POST /attendance-supplements.
   */
  createSupplement: (data: AttendanceSupplementFormData) => Promise<void>;

  /**
   * Duyệt yêu cầu bổ sung — PATCH status='approved'.
   * Side-effect: cập nhật AttendanceRecord tương ứng (checkIn/checkOut)
   * qua attendanceStore.
   */
  approveSupplement: (id: string) => Promise<void>;

  /**
   * Từ chối yêu cầu bổ sung — PATCH status='rejected'.
   * @param reason — lý do từ chối
   */
  rejectSupplement: (id: string, reason: string) => Promise<void>;

  /**
   * Duyệt hàng loạt — Promise.all parallel.
   * @param ids — mảng supplement IDs cần duyệt
   */
  bulkApproveSupplements: (ids: string[]) => Promise<void>;

  // ── ACTIONS — Audit Log ──

  /**
   * Fetch audit logs — GET /audit-logs.
   * @param filter — optional filter params
   */
  fetchAuditLogs: (filter?: Partial<AuditLogFilter>) => Promise<void>;

  /**
   * Ghi 1 entry audit log — POST /audit-logs.
   * Gọi từ mọi store action quan trọng (create, update, delete, approve...).
   * Tại sao tách ra: centralized logging, dễ track + review.
   */
  logAction: (
    entry: Omit<AuditLog, "id" | "timestamp">
  ) => Promise<void>;

  // ── ACTIONS — Data Lock ──

  /** Fetch danh sách khóa kỳ — GET /data-locks */
  fetchDataLocks: () => Promise<void>;

  /**
   * Khóa kỳ — POST /data-locks.
   * Ngăn chỉnh sửa chấm công/lương sau khi chốt kỳ.
   * @param type — 'attendance_period' | 'payroll_period'
   * @param period — "YYYY-MM"
   * @param note — ghi chú (optional)
   */
  lockPeriod: (type: LockType, period: string, note?: string) => Promise<void>;

  /**
   * Mở khóa kỳ — PATCH isLocked=false.
   * Chỉ super_admin/hr_admin mới được mở khóa.
   */
  unlockPeriod: (id: string) => Promise<void>;

  // ── COMPUTED ──

  /** Yêu cầu bổ sung chờ duyệt — status='pending', sort date asc */
  pendingSupplements: () => AttendanceSupplement[];

  /**
   * Kiểm tra kỳ đã khóa chưa.
   * @returns true nếu tồn tại DataLock với type + period + isLocked=true
   */
  isLocked: (type: LockType, period: string) => boolean;

  /**
   * Filter + sort audit logs theo tiêu chí.
   * Sort theo timestamp desc (mới nhất trước).
   */
  filteredAuditLogs: (filter: Partial<AuditLogFilter>) => AuditLog[];
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useSupplementStore = create<SupplementState>((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  supplements: [],
  auditLogs: [],
  dataLocks: [],
  loading: false,
  error: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS — Attendance Supplement
  // ═══════════════════════════════════════════════════════════════════════════

  fetchSupplements: async (month) => {
    set({ loading: true, error: null });
    try {
      // json-server: dùng date_like cho prefix matching "YYYY-MM"
      const query = month ? `?date_like=^${month}` : "";
      const res = await fetch(`${API_BASE}/attendance-supplements${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AttendanceSupplement[] = await res.json();
      set({ supplements: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách bổ sung công. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  createSupplement: async (data) => {
    if (
      !guardPermission("attendance", "create", (msg) => set({ error: msg }))
    )
      return;

    const now = nowISO();
    const newSupplement: AttendanceSupplement = {
      ...data,
      id: crypto.randomUUID(),
      status: "pending",
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    };

    const prevSupplements = get().supplements;
    set({ supplements: [...prevSupplements, newSupplement], error: null });

    try {
      const res = await fetch(`${API_BASE}/attendance-supplements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplement),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        supplements: prevSupplements,
        error:
          err instanceof Error
            ? err.message
            : "Không thể tạo yêu cầu bổ sung công. Vui lòng thử lại.",
      });
    }
  },

  approveSupplement: async (id) => {
    if (
      !guardPermission("attendance", "approve", (msg) => set({ error: msg }))
    )
      return;

    const prevSupplements = get().supplements;
    const supplement = prevSupplements.find((s) => s.id === id);
    if (!supplement) {
      set({ error: "Không tìm thấy yêu cầu bổ sung công." });
      return;
    }

    // Lock check: kỳ chấm công đã khóa → không cho duyệt
    const month = supplement.date.slice(0, 7);
    if (get().isLocked("attendance_period", month)) {
      set({ error: `Kỳ chấm công tháng ${month} đã bị khóa. Không thể duyệt bổ sung công.` });
      return;
    }

    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();

    const now = nowISO();
    const patchData = {
      status: "approved" as const,
      approvedBy: currentUser.id,
      approvedAt: now,
      updatedAt: now,
    };

    // Optimistic
    set({
      supplements: prevSupplements.map((s) =>
        s.id === id ? { ...s, ...patchData } : s
      ),
      error: null,
    });

    try {
      // 1. PATCH supplement
      const res = await fetch(`${API_BASE}/attendance-supplements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 2. Side-effect: cập nhật AttendanceRecord tương ứng
      // Tìm record chấm công theo employeeId + date, rồi PATCH checkIn/checkOut
      if (supplement.requestedCheckIn || supplement.requestedCheckOut) {
        const { useAttendanceStore } = await import("@/store/attendanceStore");
        const attendanceState = useAttendanceStore.getState();
        const attendanceRecord = attendanceState.records.find(
          (r) =>
            r.employeeId === supplement.employeeId &&
            r.date === supplement.date
        );
        if (attendanceRecord) {
          const attendancePatch: Record<string, string> = {};
          if (supplement.requestedCheckIn) {
            attendancePatch.checkIn = supplement.requestedCheckIn;
          }
          if (supplement.requestedCheckOut) {
            attendancePatch.checkOut = supplement.requestedCheckOut;
          }
          await attendanceState.updateAttendance(
            attendanceRecord.id,
            attendancePatch
          );
        }
      }
    } catch (err) {
      set({
        supplements: prevSupplements,
        error:
          err instanceof Error
            ? err.message
            : "Không thể duyệt yêu cầu bổ sung công. Vui lòng thử lại.",
      });
    }
  },

  rejectSupplement: async (id, reason) => {
    if (
      !guardPermission("attendance", "approve", (msg) => set({ error: msg }))
    )
      return;

    const prevSupplements = get().supplements;

    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();

    const now = nowISO();
    const patchData = {
      status: "rejected" as const,
      approvedBy: currentUser.id,
      approvedAt: now,
      rejectionReason: reason,
      updatedAt: now,
    };

    set({
      supplements: prevSupplements.map((s) =>
        s.id === id ? { ...s, ...patchData } : s
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/attendance-supplements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        supplements: prevSupplements,
        error:
          err instanceof Error
            ? err.message
            : "Không thể từ chối yêu cầu bổ sung công. Vui lòng thử lại.",
      });
    }
  },

  bulkApproveSupplements: async (ids) => {
    if (
      !guardPermission("attendance", "approve", (msg) => set({ error: msg }))
    )
      return;

    // Duyệt song song — Promise.all cho performance
    // Mỗi approveSupplement đã có optimistic + rollback riêng
    const approveFn = get().approveSupplement;
    await Promise.all(ids.map((id) => approveFn(id)));
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS — Audit Log
  // ═══════════════════════════════════════════════════════════════════════════

  fetchAuditLogs: async (filter) => {
    set({ loading: true, error: null });
    try {
      // Build query params cho json-server
      const params = new URLSearchParams();
      if (filter?.userId) params.set("userId", filter.userId);
      if (filter?.module) params.set("module", filter.module);
      if (filter?.action) params.set("action", filter.action);
      // Pagination
      if (filter?.page) params.set("_page", String(filter.page));
      if (filter?.pageSize) params.set("_limit", String(filter.pageSize));

      const res = await fetch(`${API_BASE}/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data: AuditLog[] = await res.json();

      // M12: Client-side sort — mới nhất lên đầu (tránh phụ thuộc json-server sort syntax)
      data.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      set({ auditLogs: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải nhật ký hệ thống. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  logAction: async (entry) => {
    // Không guard — audit log được ghi từ mọi nơi, không cần quyền riêng
    const newLog: AuditLog = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: nowISO(),
    };

    // Append vào state (không optimistic rollback — log hiếm khi fail)
    set((state) => ({ auditLogs: [newLog, ...state.auditLogs] }));

    try {
      const res = await fetch(`${API_BASE}/audit-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Silent fail — audit log failure không nên block business logic
      // TODO: Queue failed logs + retry khi có real backend
      if (process.env.NODE_ENV !== "production") {
        console.error("[AuditLog] Failed to persist log entry:", newLog.id);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS — Data Lock
  // ═══════════════════════════════════════════════════════════════════════════

  fetchDataLocks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/data-locks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DataLock[] = await res.json();
      set({ dataLocks: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách khóa kỳ. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  lockPeriod: async (type, period, note) => {
    // Chỉ HR+ mới được khóa kỳ — dùng module tương ứng
    const module = type === "attendance_period" ? "attendance" : "payroll";
    if (!guardPermission(module, "approve", (msg) => set({ error: msg })))
      return;

    // Check đã khóa chưa — tránh duplicate
    if (get().isLocked(type, period)) {
      set({ error: `Kỳ ${period} đã được khóa trước đó.` });
      return;
    }

    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();

    const now = nowISO();
    const newLock: DataLock = {
      id: crypto.randomUUID(),
      type,
      period,
      lockedBy: currentUser.id,
      lockedAt: now,
      unlockedBy: null,
      unlockedAt: null,
      isLocked: true,
      note,
    };

    const prevLocks = get().dataLocks;
    set({ dataLocks: [...prevLocks, newLock], error: null });

    try {
      const res = await fetch(`${API_BASE}/data-locks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLock),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        dataLocks: prevLocks,
        error:
          err instanceof Error
            ? err.message
            : "Không thể khóa kỳ. Vui lòng thử lại.",
      });
    }
  },

  unlockPeriod: async (id) => {
    // Mở khóa cũng cần approve
    const lock = get().dataLocks.find((l) => l.id === id);
    if (!lock) {
      set({ error: "Không tìm thấy bản ghi khóa kỳ." });
      return;
    }

    const module =
      lock.type === "attendance_period" ? "attendance" : "payroll";
    if (!guardPermission(module, "approve", (msg) => set({ error: msg })))
      return;

    const { useAccountStore } = await import("@/store/accountStore");
    const { currentUser } = useAccountStore.getState();

    const now = nowISO();
    const patchData = {
      isLocked: false,
      unlockedBy: currentUser.id,
      unlockedAt: now,
    };

    const prevLocks = get().dataLocks;
    set({
      dataLocks: prevLocks.map((l) =>
        l.id === id ? { ...l, ...patchData } : l
      ),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/data-locks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        dataLocks: prevLocks,
        error:
          err instanceof Error
            ? err.message
            : "Không thể mở khóa kỳ. Vui lòng thử lại.",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  pendingSupplements: () => {
    return get()
      .supplements.filter((s) => s.status === "pending")
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  isLocked: (type, period) => {
    return get().dataLocks.some(
      (l) => l.type === type && l.period === period && l.isLocked
    );
  },

  filteredAuditLogs: (filter) => {
    let result = [...get().auditLogs];

    if (filter.userId) {
      result = result.filter((l) => l.userId === filter.userId);
    }
    if (filter.module) {
      result = result.filter((l) => l.module === filter.module);
    }
    if (filter.action) {
      result = result.filter((l) => l.action === filter.action);
    }
    if (filter.dateFrom) {
      result = result.filter((l) => l.timestamp >= filter.dateFrom!);
    }
    if (filter.dateTo) {
      // dateTo inclusive — so sánh qua cuối ngày
      const endOfDay = `${filter.dateTo}T23:59:59.999Z`;
      result = result.filter((l) => l.timestamp <= endOfDay);
    }

    // Sort timestamp desc — mới nhất trước
    result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return result;
  },
}));
