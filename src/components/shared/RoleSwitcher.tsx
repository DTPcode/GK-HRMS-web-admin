"use client";

// ============================================================================
// GK-HRMS — RoleSwitcher (DEV ONLY)
// Cho phép chuyển đổi role mock để test phân quyền RBAC.
// Chỉ hiện trong development mode — production build sẽ bị ẩn.
// TODO: Replace với real JWT khi backend sẵn — xóa component này khi go-live
// ============================================================================

import { Shield } from "lucide-react";
import { toast } from "sonner";
import { useAccountStore } from "@/store/accountStore";
import { MOCK_USERS, setMockRole } from "@/lib/mockAuth";
import { ROLE_CONFIG, type UserRole } from "@/types/account";

/**
 * Dropdown chuyển đổi role — dùng để test phân quyền nhanh.
 *
 * Tại sao dùng native <select> thay vì shadcn Select:
 *   - Component này chỉ dùng DEV mode, không cần style fancy
 *   - Tránh thêm complexity cho thứ sẽ bị xóa trước production
 */
export function RoleSwitcher() {
  const currentUser = useAccountStore((s) => s.currentUser);
  const switchRole = useAccountStore((s) => s.switchRole);
  const setCurrentUser = useAccountStore((s) => s.setCurrentUser);

  // Chỉ hiện trong development mode
  if (process.env.NODE_ENV !== "development") return null;

  const handleRoleChange = (newRole: UserRole) => {
    // 1. Cập nhật localStorage (persist qua reload)
    setMockRole(newRole);

    // 2. Tìm mock user tương ứng
    const mockUser = MOCK_USERS.find((u) => u.role === newRole);
    if (mockUser) {
      // Cập nhật toàn bộ user info (username, email, branchId...)
      setCurrentUser(mockUser);
    } else {
      // Fallback: chỉ đổi role trên currentUser hiện tại
      switchRole(newRole);
    }

    toast.info(`Đã chuyển sang: ${ROLE_CONFIG[newRole].label_vi}`, {
      description: ROLE_CONFIG[newRole].description,
      duration: 2000,
    });
  };

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
      <Shield className="h-3.5 w-3.5 text-amber-600" />
      <span className="hidden text-[10px] font-medium text-amber-600 sm:inline">
        DEV
      </span>
      <select
        value={currentUser.role}
        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
        className="h-6 cursor-pointer rounded border-none bg-transparent text-xs font-medium text-amber-700 focus:outline-none focus:ring-0"
        aria-label="Chuyển đổi vai trò (DEV)"
      >
        {MOCK_USERS.map((user) => (
          <option key={user.role} value={user.role}>
            {ROLE_CONFIG[user.role].label_vi}
          </option>
        ))}
      </select>
    </div>
  );
}
