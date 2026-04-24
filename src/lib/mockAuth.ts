// ============================================================================
// GK-HRMS — Mock Authentication
// Giả lập đăng nhập bằng localStorage — chỉ dùng khi chưa có backend thật
// TODO: Replace với real JWT khi backend sẵn
// ============================================================================

import type { UserAccount, UserRole } from "@/types/account";

/** Key lưu role hiện tại trong localStorage */
const STORAGE_KEY = "mock_current_role";

/** 6 tài khoản mẫu — mỗi role 1 user để test phân quyền */
export const MOCK_USERS: UserAccount[] = [
  {
    id: "acc-001",
    username: "admin",
    employeeId: null,
    email: "admin@giakhanh.vn",
    role: "super_admin",
    permissions: [],
    branchId: null,
    isActive: true,
    lastLoginAt: "2024-04-20T08:00:00Z",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2024-04-20T08:00:00Z",
  },
  {
    id: "acc-002",
    username: "hr.admin",
    employeeId: "emp-010",
    email: "hr@giakhanh.vn",
    role: "hr_admin",
    permissions: [],
    branchId: null,
    isActive: true,
    lastLoginAt: "2024-04-19T09:00:00Z",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2024-04-19T09:00:00Z",
  },
  {
    id: "acc-003",
    username: "branch.q1",
    employeeId: "emp-020",
    email: "branch.q1@giakhanh.vn",
    role: "branch_manager",
    permissions: [],
    branchId: "branch-001",
    isActive: true,
    lastLoginAt: "2024-04-18T10:00:00Z",
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2024-04-18T10:00:00Z",
  },
  {
    id: "acc-004",
    username: "ketoan",
    employeeId: "emp-040",
    email: "ketoan@giakhanh.vn",
    role: "accountant",
    permissions: [],
    branchId: null,
    isActive: true,
    lastLoginAt: "2024-04-17T10:00:00Z",
    createdAt: "2023-06-01T00:00:00Z",
    updatedAt: "2024-04-17T10:00:00Z",
  },
  {
    id: "acc-005",
    username: "giamdoc",
    employeeId: "emp-001",
    email: "giamdoc@giakhanh.vn",
    role: "director",
    permissions: [],
    branchId: null,
    isActive: true,
    lastLoginAt: "2024-04-16T08:00:00Z",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2024-04-16T08:00:00Z",
  },
];

/**
 * Lấy mock user hiện tại dựa trên role đã lưu trong localStorage.
 * Default: super_admin nếu chưa chọn role.
 *
 * Lưu ý: Gọi trong client component (cần "use client") vì dùng localStorage.
 */
export function getCurrentMockUser(): UserAccount {
  if (typeof window === "undefined") {
    // SSR fallback — trả super_admin
    return MOCK_USERS[0];
  }

  const savedRole = localStorage.getItem(STORAGE_KEY) as UserRole | null;
  if (!savedRole) return MOCK_USERS[0];

  return MOCK_USERS.find((u) => u.role === savedRole) ?? MOCK_USERS[0];
}

/**
 * Đổi role mock — dùng ở RoleSwitcher hoặc DevTools
 */
export function setMockRole(role: UserRole): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, role);
}
