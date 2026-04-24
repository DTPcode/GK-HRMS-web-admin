"use client";

// ============================================================================
// GK-HRMS — LanguageSwitcher
// Đổi role mock (dev tool) — đặt ở Topbar hoặc footer để test phân quyền
// Lưu ý: Component này thực chất là Role Switcher, không phải i18n
// ============================================================================

import { useAccountStore } from "@/store/accountStore";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/types/account";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";

const ROLES: UserRole[] = ["super_admin", "hr_admin", "branch_manager", "accountant", "director"];

export function LanguageSwitcher() {
  const currentUser = useAccountStore((s) => s.currentUser);
  const switchRole = useAccountStore((s) => s.switchRole);

  return (
    <div className="flex items-center gap-2">
      <ShieldCheck className="h-4 w-4 text-slate-400" />
      <Select
        value={currentUser.role}
        onValueChange={(value) => switchRole(value as UserRole)}
      >
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="Chọn role" />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem key={role} value={role} className="text-xs">
              {ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
