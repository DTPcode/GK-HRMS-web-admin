"use client";

// ============================================================================
// GK-HRMS — RoleSwitcher (DEV ONLY)
// Cho phép chuyển đổi mock user để test phân quyền RBAC + 3-party workflow.
// Hiện danh sách user (không phải role) để hỗ trợ nhiều user cùng role.
// TODO: Replace với real JWT khi backend sẵn — xóa component này khi go-live
// ============================================================================

import { Shield } from "lucide-react";
import { toast } from "sonner";
import { useAccountStore } from "@/store/accountStore";
import { MOCK_USERS, setMockRole } from "@/lib/mockAuth";
import { ROLE_CONFIG } from "@/types/account";

export function RoleSwitcher() {
  const currentUser = useAccountStore((s) => s.currentUser);
  const setCurrentUser = useAccountStore((s) => s.setCurrentUser);

  if (process.env.NODE_ENV !== "development") return null;

  const handleUserChange = (userId: string) => {
    const mockUser = MOCK_USERS.find((u) => u.id === userId);
    if (!mockUser) return;

    // Persist cả role + userId
    setMockRole(mockUser.role, mockUser.id);
    setCurrentUser(mockUser);

    const roleLabel = ROLE_CONFIG[mockUser.role]?.label_vi ?? mockUser.role;
    toast.info(`Đã chuyển sang: ${mockUser.username}`, {
      description: `${roleLabel}${mockUser.branchId ? ` — CN ${mockUser.branchId.replace("branch-", "")}` : ""}`,
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
        value={currentUser.id}
        onChange={(e) => handleUserChange(e.target.value)}
        className="h-6 cursor-pointer rounded border-none bg-transparent text-xs font-medium text-amber-700 focus:outline-none focus:ring-0"
        aria-label="Chuyển đổi user (DEV)"
      >
        {MOCK_USERS.map((user) => {
          const roleLabel = ROLE_CONFIG[user.role]?.label_vi ?? user.role;
          const branchSuffix = user.branchId
            ? ` (${user.branchId.replace("branch-0", "CN ")})`
            : "";
          return (
            <option key={user.id} value={user.id}>
              {roleLabel}{branchSuffix}
            </option>
          );
        })}
      </select>
    </div>
  );
}
