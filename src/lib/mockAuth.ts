// ============================================================================
// GK-HRMS — Mock Authentication
// Giả lập đăng nhập bằng localStorage — chỉ dùng khi chưa có backend thật
// TODO: Replace với real JWT khi backend sẵn
// ============================================================================

import type { UserAccount, UserRole } from "@/types/account";

/** Key lưu role hiện tại trong localStorage */
const STORAGE_KEY = "mock_current_role";

/** Mock user extended — thêm password cho login flow test */
export interface MockUser extends UserAccount {
  password: string;
}

/** 6 tài khoản mẫu — mỗi role 1+ user để test phân quyền. Sync với db.json/accounts */
export const MOCK_USERS: MockUser[] = [
  {
    id: "acc-001",
    username: "admin",
    password: "admin123",
    employeeId: null,
    email: "admin@giakhanh.vn",
    role: "super_admin",
    permissions: [],
    branchId: null,
    isActive: true,
    lastLoginAt: "2026-04-23T08:00:00Z",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2026-04-23T08:00:00Z",
  },
  {
    id: "acc-002",
    username: "hr.thao",
    password: "hr123",
    employeeId: "emp-022",
    email: "thao.duong@giakhanh.vn",
    role: "hr_admin",
    permissions: [],
    branchId: null,
    isActive: true,
    lastLoginAt: "2026-04-22T09:00:00Z",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2026-04-22T09:00:00Z",
  },
  {
    id: "acc-003",
    username: "branch.q1",
    password: "branch123",
    employeeId: "emp-006",
    email: "tuan.hoang@giakhanh.vn",
    role: "branch_manager",
    permissions: [],
    branchId: "branch-01",
    isActive: true,
    lastLoginAt: "2026-04-21T10:00:00Z",
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2026-04-21T10:00:00Z",
  },
  {
    id: "acc-004",
    username: "ketoan.huy",
    password: "acc123",
    employeeId: "emp-008",
    email: "huy.bui@giakhanh.vn",
    role: "accountant",
    permissions: [],
    branchId: null,
    isActive: true,
    lastLoginAt: "2026-04-20T10:00:00Z",
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2026-04-20T10:00:00Z",
  },
  {
    id: "acc-005",
    username: "giamdoc",
    password: "dir123",
    employeeId: "emp-001",
    email: "giamdoc@giakhanh.vn",
    role: "director",
    permissions: [],
    branchId: null,
    isActive: true,
    lastLoginAt: "2026-04-16T08:00:00Z",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2026-04-16T08:00:00Z",
  },
  {
    id: "acc-006",
    username: "branch.q3",
    password: "branch123",
    employeeId: "emp-010",
    email: "minh.le@giakhanh.vn",
    role: "branch_manager",
    permissions: [],
    branchId: "branch-03",
    isActive: true,
    lastLoginAt: "2026-04-25T09:00:00Z",
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2026-04-25T09:00:00Z",
  },
];

/** Key lưu user ID hiện tại trong localStorage (ưu tiên hơn role) */
const USER_ID_KEY = "mock_current_user_id";

/**
 * Lấy mock user hiện tại.
 * Ưu tiên: user ID -> role -> default super_admin
 */
export function getCurrentMockUser(): UserAccount {
  if (typeof window === "undefined") {
    return MOCK_USERS[0];
  }

  // Ưu tiên tìm theo user ID (hỗ trợ nhiều user cùng role)
  const savedId = localStorage.getItem(USER_ID_KEY);
  if (savedId) {
    const user = MOCK_USERS.find((u) => u.id === savedId);
    if (user) return user;
  }

  // Fallback: tìm theo role
  const savedRole = localStorage.getItem(STORAGE_KEY) as UserRole | null;
  if (!savedRole) return MOCK_USERS[0];

  return MOCK_USERS.find((u) => u.role === savedRole) ?? MOCK_USERS[0];
}

/**
 * Đổi role mock — dùng ở RoleSwitcher hoặc DevTools.
 * Nếu truyền userId, lưu cả user ID để phân biệt khi cùng role.
 */
export function setMockRole(role: UserRole, userId?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, role);
  if (userId) {
    localStorage.setItem(USER_ID_KEY, userId);
  } else {
    localStorage.removeItem(USER_ID_KEY);
  }
}

