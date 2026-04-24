// ============================================================================
// GK-HRMS — Account & RBAC Types
// Dùng cho: AccountForm, AccountTable, AccountStore, mockAuth, usePermission
// Constraint: chỉ import từ zod — KHÔNG import từ ./common
// Zod v4: dùng { error: "..." } thay { required_error: "..." }
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums & Base Schemas
// ---------------------------------------------------------------------------

/** 5 vai trò phân quyền RBAC theo cơ cấu tổ chức Gia Khánh */
export const userRoleSchema = z.enum(
  ["super_admin", "hr_admin", "branch_manager", "accountant", "director"],
  { error: "Vai trò người dùng là bắt buộc" }
);

/** 6 module chức năng trong hệ thống */
export const moduleSchema = z.enum(
  ["employees", "contracts", "attendance", "payroll", "accounts", "reports"],
  { error: "Module là bắt buộc" }
);

/** Các hành động có thể thực hiện trên 1 module */
export const actionSchema = z.enum(
  ["view", "create", "update", "delete", "approve", "export"],
  { error: "Hành động là bắt buộc" }
);

// ---------------------------------------------------------------------------
// Permission Schema
// ---------------------------------------------------------------------------

/**
 * Quyền trên 1 module cụ thể.
 * Dùng trong: ROLE_PERMISSIONS, UserAccount.permissions, usePermission hook.
 */
export const permissionSchema = z.object({
  /** Module áp dụng quyền */
  module: moduleSchema,
  /** Danh sách hành động được phép */
  actions: z.array(actionSchema).min(1, "Phải có ít nhất 1 hành động"),
});

// ---------------------------------------------------------------------------
// UserAccount Schema
// ---------------------------------------------------------------------------

/**
 * Tài khoản đăng nhập hệ thống.
 * Map 1:1 với document /accounts trong db.json.
 * Mỗi account gắn với 1 role + optional override permissions.
 */
export const userAccountSchema = z.object({
  id: z
    .string({ error: "ID tài khoản là bắt buộc" })
    .uuid("ID tài khoản phải là UUID hợp lệ"),

  /**
   * FK tới /employees.
   * null nếu account hệ thống (super_admin) không phải nhân viên thực.
   */
  employeeId: z
    .string()
    .uuid("employeeId phải là UUID hợp lệ")
    .nullable(),

  username: z
    .string({ error: "Tên đăng nhập là bắt buộc" })
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(50, "Tên đăng nhập không được quá 50 ký tự"),

  email: z
    .string({ error: "Email là bắt buộc" })
    .email("Email không hợp lệ"),

  /** Vai trò chính — quyết định default permissions */
  role: userRoleSchema,

  /**
   * Override permissions ngoài default của role.
   * Ví dụ: branch_manager cần thêm quyền export payroll.
   * Mảng rỗng = dùng 100% default permissions của role.
   */
  permissions: z.array(permissionSchema).default([]),

  /**
   * Chi nhánh quản lý — giới hạn data scope.
   * null = xem tất cả chi nhánh (super_admin, hr_admin, director).
   * có giá trị = chỉ xem data chi nhánh được gán (branch_manager, accountant).
   */
  branchId: z
    .string()
    .min(1, "Chi nhánh không được để trống")
    .nullable(),

  /** Tài khoản có đang active? false = bị khóa, không thể đăng nhập */
  isActive: z.boolean({ error: "Trạng thái tài khoản là bắt buộc" }),

  /** Lần đăng nhập cuối — ISO 8601, null nếu chưa từng login */
  lastLoginAt: z
    .string()
    .datetime({ message: "lastLoginAt phải là ISO datetime" })
    .nullable(),

  /** ISO 8601 datetime */
  createdAt: z.string().datetime({ message: "createdAt phải là ISO datetime" }),

  /** ISO 8601 datetime */
  updatedAt: z.string().datetime({ message: "updatedAt phải là ISO datetime" }),
});

/**
 * Schema form tạo / sửa tài khoản.
 * Bỏ id, lastLoginAt, createdAt, updatedAt vì server quản lý.
 */
export const accountFormSchema = userAccountSchema.omit({
  id: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
});

// ---------------------------------------------------------------------------
// Derived Types
// ---------------------------------------------------------------------------

/** Union 4 role trong hệ thống */
export type UserRole = z.infer<typeof userRoleSchema>;

/** Union 6 module */
export type Module = z.infer<typeof moduleSchema>;

/** Union 6 action */
export type Action = z.infer<typeof actionSchema>;

/** Quyền trên 1 module — dùng trong ROLE_PERMISSIONS & usePermission */
export type Permission = z.infer<typeof permissionSchema>;

/** Backward-compatible alias — dùng ở constants.ts, RolePermissionMatrix */
export type ModulePermission = Permission;

/** Ma trận phân quyền theo role — dùng ở constants.ts */
export type RolePermissionMap = Record<UserRole, Permission[]>;

/** Entity tài khoản đầy đủ — dùng trong store, table, mockAuth */
export type UserAccount = z.infer<typeof userAccountSchema>;

/** Payload form tạo / sửa — dùng trong AccountForm */
export type AccountFormData = z.infer<typeof accountFormSchema>;

// ---------------------------------------------------------------------------
// AccountFilter — dùng cho AccountTable
// ---------------------------------------------------------------------------

/**
 * Params lọc danh sách tài khoản.
 * Dùng trong: accountStore.filter, AccountPageClient.
 */
export interface AccountFilter {
  /** Tìm theo username / email */
  search?: string;
  /** Lọc theo role */
  role?: UserRole;
  /** Lọc active / inactive */
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// AuditLog — ghi nhận mọi thay đổi quan trọng
// ---------------------------------------------------------------------------

/**
 * Bản ghi audit trail — tracking mọi hành động CRUD trong hệ thống.
 * Dùng trong: AuditLogTable, ReportPageClient, compliance.
 */
export interface AuditLog {
  id: string;
  /** ID user thực hiện hành động */
  userId: string;
  /** Hành động: "create" | "update" | "delete" | "approve" | "login" ... */
  action: string;
  /** Module liên quan */
  module: string;
  /** ID đối tượng bị tác động (employeeId, contractId...) */
  targetId: string;
  /**
   * Chi tiết thay đổi — key là field name.
   * Ví dụ: { "salary": { before: 8000000, after: 10000000 } }
   */
  changes: Record<string, { before: unknown; after: unknown }>;
  /** ISO 8601 datetime */
  timestamp: string;
  /** IP address của client */
  ipAddress: string;
}

// ---------------------------------------------------------------------------
// Constants — ROLE_PERMISSIONS
// ---------------------------------------------------------------------------

/** Tất cả actions có thể */
const ALL_ACTIONS: Action[] = ["view", "create", "update", "delete", "approve", "export"];

/** Chỉ xem + xuất báo cáo */
const VIEW_ONLY: Action[] = ["view"];

/** Tất cả modules */
const ALL_MODULES: Module[] = [
  "employees", "contracts", "attendance", "payroll", "accounts", "reports",
];

/**
 * Default permissions cho mỗi role.
 * Dùng trong: usePermission hook, AccountForm, RolePermissionMatrix.
 *
 * Hierarchy:
 *   super_admin    → God mode: tất cả modules × tất cả actions
 *   hr_admin       → Full CRUD employees/contracts/attendance/reports, payroll (view+create), accounts (view)
 *   branch_manager → attendance (full, branch scope), employees (view), payroll (view)
 *   accountant     → payroll (full), attendance (view), reports (view+export)
 *   director       → Tất cả modules chỉ view + approve, reports (full)
 *   director        → Xem + duyệt tất cả modules, toàn quyền báo cáo
 */
export const ROLE_PERMISSIONS: RolePermissionMap = {
  // --- Super Admin: toàn quyền ---
  super_admin: ALL_MODULES.map((module) => ({
    module,
    actions: ALL_ACTIONS,
  })),

  // --- HR Admin: quản lý nhân sự toàn diện, lương hạn chế ---
  hr_admin: [
    { module: "employees",  actions: ["view", "create", "update", "delete", "export"] },
    { module: "contracts",  actions: ["view", "create", "update", "delete", "export"] },
    { module: "attendance", actions: ["view", "create", "update", "approve", "export"] },
    { module: "payroll",    actions: ["view", "create"] },
    { module: "accounts",   actions: ["view"] },
    { module: "reports",    actions: ["view", "create", "update", "delete", "export"] },
  ],

  // --- Branch Manager: quản lý chấm công chi nhánh, xem NV & lương ---
  branch_manager: [
    { module: "employees",  actions: ["view"] },
    { module: "attendance", actions: ["view", "create", "update", "delete", "approve"] },
    { module: "payroll",    actions: ["view"] },
  ],

  // --- Accountant (Kế toán): quản lý lương + xem chấm công & báo cáo ---
  accountant: [
    { module: "payroll",    actions: ["view", "create", "update", "delete", "approve", "export"] },
    { module: "attendance", actions: ["view"] },
    { module: "reports",    actions: ["view", "export"] },
  ],

  // --- Director (Ban Giám đốc): xem + duyệt tất cả, toàn quyền báo cáo ---
  director: [
    { module: "employees",  actions: ["view", "approve"] },
    { module: "contracts",  actions: ["view", "approve"] },
    { module: "attendance", actions: ["view", "approve"] },
    { module: "payroll",    actions: ["view", "approve"] },
    { module: "accounts",   actions: ["view", "approve"] },
    { module: "reports",    actions: ["view", "create", "update", "delete", "approve", "export"] },
  ],
};

/**
 * Cấu hình hiển thị role.
 * Dùng trong: AccountTable badge, AccountForm Select, Topbar role label.
 */
export const ROLE_CONFIG: Record<
  UserRole,
  { label_vi: string; badgeColor: string; description: string }
> = {
  super_admin: {
    label_vi: "Quản trị viên",
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    description: "Toàn quyền hệ thống",
  },
  hr_admin: {
    label_vi: "Quản lý nhân sự",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    description: "Quản lý NV, hợp đồng, chấm công, báo cáo",
  },
  branch_manager: {
    label_vi: "Quản lý chi nhánh",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Quản lý chấm công chi nhánh",
  },
  accountant: {
    label_vi: "Kế toán",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    description: "Quản lý bảng lương, xem chấm công",
  },
  director: {
    label_vi: "Ban Giám đốc",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    description: "Xem và duyệt tất cả, toàn quyền báo cáo",
  },
};
