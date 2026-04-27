// ============================================================================
// GK-HRMS — Account Store (Zustand v5)
// Pattern: STATE → ACTIONS → COMPUTED
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { API_BASE } from "@/lib/constants";
import { guardPermission } from "@/lib/guardPermission";
import type {
  UserAccount,
  AccountFormData,
  AccountFilter,
  UserRole,
  Module,
  Action,
  AuditLog,
} from "@/types/account";
import { ROLE_PERMISSIONS } from "@/types/account";
import { getCurrentMockUser } from "@/lib/mockAuth";



// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowISO = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Default Current User — cho dev mode (mock auth)
// Đọc từ localStorage ngay khi store khởi tạo để ProtectedRoute có role đúng.
// ---------------------------------------------------------------------------

const FALLBACK_USER: UserAccount = {
  id: "admin-001",
  employeeId: null,
  username: "admin",
  email: "admin@giakhanh.vn",
  role: "super_admin",
  permissions: [],
  branchId: null,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Khởi tạo current user từ localStorage (nếu có).
 * Tại sao không dùng useEffect: ProtectedRoute check quyền ngay render đầu tiên,
 * nếu đợi useEffect sync sẽ bị race condition (luôn pass với super_admin).
 */
function getInitialUser(): UserAccount {
  if (typeof window === "undefined") return FALLBACK_USER;
  try {
    return getCurrentMockUser();
  } catch {
    return FALLBACK_USER;
  }
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface AccountState {
  // ── STATE ──
  accounts: UserAccount[];
  /** User đang đăng nhập — null khi chưa login (hiện tại dùng mock) */
  currentUser: UserAccount;
  loading: boolean;
  error: string | null;
  filter: AccountFilter;
  auditLogs: AuditLog[];

  // ── ACTIONS ──

  /**
   * Fetch danh sách tài khoản từ json-server.
   * Side-effects: set loading → GET /accounts → set accounts.
   */
  fetchAccounts: () => Promise<void>;

  /**
   * Tạo tài khoản mới — optimistic update.
   * Side-effects: generate id → POST /accounts → rollback nếu lỗi.
   * @param data — payload từ AccountForm
   */
  createAccount: (data: AccountFormData) => Promise<void>;

  /**
   * Cập nhật tài khoản — PATCH.
   * @param id — account ID
   * @param data — fields cần cập nhật
   */
  updateAccount: (id: string, data: Partial<AccountFormData>) => Promise<void>;

  /**
   * Thay đổi role của account.
   * Side-effects: PATCH /accounts/:id → role = newRole.
   * @param id — account ID
   * @param role — role mới
   */
  updateRole: (id: string, role: UserRole) => Promise<void>;

  /**
   * Toggle trạng thái active/inactive của account.
   * Side-effects: PATCH /accounts/:id → isActive = !isActive.
   * @param id — account ID
   */
  toggleActive: (id: string) => Promise<void>;

  /** Backward-compat alias cho toggleActive */
  toggleAccountStatus: (id: string) => Promise<void>;


  /**
   * Xóa tài khoản — optimistic update.
   * @param id — account ID
   */
  deleteAccount: (id: string) => Promise<void>;

  /**
   * Chuyển đổi role (dev tool) — đổi currentUser.role để test phân quyền.
   * Side-effects: update currentUser in state.
   * @param role — role mới
   */
  switchRole: (role: UserRole) => void;

  /** Set current user (dùng sau login) */
  setCurrentUser: (user: UserAccount) => void;

  setFilter: (partial: Partial<AccountFilter>) => void;
  resetFilter: () => void;

  /**
   * Fetch audit logs từ json-server.
   * Side-effects: GET /audit-logs → set auditLogs.
   */
  fetchAuditLogs: () => Promise<void>;

  // ── COMPUTED ──

  /**
   * Kiểm tra currentUser có quyền thực hiện action trên module hay không.
   * Logic: check ROLE_PERMISSIONS[currentUser.role] + currentUser.permissions override.
   * @param module — module cần kiểm tra
   * @param action — hành động cần kiểm tra
   * @returns true nếu có quyền
   */
  hasPermission: (module: Module, action: Action) => boolean;

  /** Lọc danh sách accounts theo filter */
  filteredAccounts: () => UserAccount[];
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useAccountStore = create<AccountState>((set, get) => ({
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  accounts: [],
  currentUser: getInitialUser(),
  loading: false,
  error: null,
  filter: {},
  auditLogs: [],

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/accounts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: UserAccount[] = await res.json();
      set({ accounts: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách tài khoản. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  createAccount: async (data) => {
    if (!guardPermission("accounts", "create", (msg) => set({ error: msg }))) return;

    const now = nowISO();
    const newAccount: UserAccount = {
      ...data,
      id: crypto.randomUUID(),
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const prev = get().accounts;
    set({ accounts: [...prev, newAccount], error: null });

    try {
      const res = await fetch(`${API_BASE}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Audit log — fire-and-forget
      const { currentUser } = get();
      import("@/store/supplementStore").then(({ useSupplementStore }) => {
        useSupplementStore.getState().logAction({
          userId: currentUser.id,
          userName: currentUser.username,
          action: "create",
          module: "accounts",
          targetId: newAccount.id,
          targetName: newAccount.username,
          changes: null,
          ipAddress: "mock-ip",
        });
      });
    } catch (err) {
      set({
        accounts: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể tạo tài khoản. Vui lòng thử lại.",
      });
    }
  },

  updateAccount: async (id, data) => {
    if (!guardPermission("accounts", "update", (msg) => set({ error: msg }))) return;

    const prev = get().accounts;
    const patchData = { ...data, updatedAt: nowISO() };

    set({
      accounts: prev.map((a) => (a.id === id ? { ...a, ...patchData } : a)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        accounts: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật tài khoản. Vui lòng thử lại.",
      });
    }
  },

  updateRole: async (id, role) => {
    if (!guardPermission("accounts", "update", (msg) => set({ error: msg }))) return;

    const prev = get().accounts;
    const patchData = { role, updatedAt: nowISO() };

    set({
      accounts: prev.map((a) => (a.id === id ? { ...a, ...patchData } : a)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Audit log — fire-and-forget
      const { currentUser } = get();
      const target = prev.find((a) => a.id === id);
      import("@/store/supplementStore").then(({ useSupplementStore }) => {
        useSupplementStore.getState().logAction({
          userId: currentUser.id,
          userName: currentUser.username,
          action: "update",
          module: "accounts",
          targetId: id,
          targetName: target?.username ?? id,
          changes: { role: { before: target?.role, after: role } },
          ipAddress: "mock-ip",
        });
      });
    } catch (err) {
      set({
        accounts: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể thay đổi vai trò. Vui lòng thử lại.",
      });
    }
  },

  toggleActive: async (id) => {
    if (!guardPermission("accounts", "update", (msg) => set({ error: msg }))) return;

    const prev = get().accounts;
    const account = prev.find((a) => a.id === id);
    if (!account) return;

    const patchData = { isActive: !account.isActive, updatedAt: nowISO() };

    set({
      accounts: prev.map((a) => (a.id === id ? { ...a, ...patchData } : a)),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Audit log — fire-and-forget
      const { currentUser } = get();
      import("@/store/supplementStore").then(({ useSupplementStore }) => {
        useSupplementStore.getState().logAction({
          userId: currentUser.id,
          userName: currentUser.username,
          action: "update",
          module: "accounts",
          targetId: id,
          targetName: account.username,
          changes: { isActive: { before: account.isActive, after: !account.isActive } },
          ipAddress: "mock-ip",
        });
      });
    } catch (err) {
      set({
        accounts: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể thay đổi trạng thái tài khoản. Vui lòng thử lại.",
      });
    }
  },

  // Backward-compat alias
  toggleAccountStatus: async (id) => {
    await get().toggleActive(id);
  },

  deleteAccount: async (id) => {
    if (!guardPermission("accounts", "delete", (msg) => set({ error: msg }))) return;

    const prev = get().accounts;

    set({
      accounts: prev.filter((a) => a.id !== id),
      error: null,
    });

    try {
      const res = await fetch(`${API_BASE}/accounts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      set({
        accounts: prev,
        error:
          err instanceof Error
            ? err.message
            : "Không thể xóa tài khoản. Vui lòng thử lại.",
      });
    }
  },

  switchRole: (role) => {
    set((state) => ({
      currentUser: { ...state.currentUser, role, updatedAt: nowISO() },
    }));
  },

  setCurrentUser: (user) => {
    set({ currentUser: user });
  },

  setFilter: (partial) => {
    set((state) => ({ filter: { ...state.filter, ...partial } }));
  },

  resetFilter: () => {
    set({ filter: {} });
  },

  fetchAuditLogs: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/audit-logs`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AuditLog[] = await res.json();
      set({ auditLogs: data });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải nhật ký hoạt động. Vui lòng thử lại.",
      });
    } finally {
      set({ loading: false });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  hasPermission: (module, action) => {
    const { currentUser } = get();
    // currentUser luôn có giá trị (khởi tạo từ getInitialUser/FALLBACK_USER)

    // 1. Check role default permissions
    const rolePerms = ROLE_PERMISSIONS[currentUser.role] ?? [];
    const modulePerm = rolePerms.find((p) => p.module === module);

    if (modulePerm && (modulePerm.actions as string[]).includes(action)) {
      return true;
    }

    // 2. Check user-level override permissions
    const overridePerm = currentUser.permissions.find((p) => p.module === module);
    if (overridePerm && (overridePerm.actions as string[]).includes(action)) {
      return true;
    }

    return false;
  },

  filteredAccounts: () => {
    const { accounts, filter } = get();
    let result = [...accounts];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.username.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
      );
    }

    if (filter.role) {
      result = result.filter((a) => a.role === filter.role);
    }

    if (filter.isActive !== undefined) {
      result = result.filter((a) => a.isActive === filter.isActive);
    }

    return result;
  },
}));
