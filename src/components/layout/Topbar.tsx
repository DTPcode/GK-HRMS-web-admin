"use client";

// ============================================================================
// GK-HRMS — Topbar
// Header trên cùng: hamburger (mobile), search, RoleSwitcher (DEV), user menu
// Responsive: hamburger hiện < lg, search co giãn
// ============================================================================

import { useEffect } from "react";
import { Bell, Search, Menu } from "lucide-react";
import { useAccountStore } from "@/store/accountStore";
import { getInitials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { toggleMobileSidebar } from "@/components/layout/Sidebar";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";
import { getCurrentMockUser } from "@/lib/mockAuth";

export function Topbar() {
  const currentUser = useAccountStore((s) => s.currentUser);
  const setCurrentUser = useAccountStore((s) => s.setCurrentUser);

  // Sync currentUser từ localStorage khi mount (restore persisted role)
  // TODO: Replace với real JWT session check khi backend sẵn
  useEffect(() => {
    const mockUser = getCurrentMockUser();
    if (mockUser.role !== currentUser.role) {
      setCurrentUser(mockUser);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6">
      {/* Left — Hamburger (mobile) + Search */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Hamburger — chỉ hiện < lg */}
        <button
          onClick={toggleMobileSidebar}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-64"
          />
        </div>
      </div>

      {/* Right — Notifications + User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* DEV: Role Switcher — chỉ hiện trong development mode */}
        <RoleSwitcher />

        {/* Notification bell */}
        <button
          className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Thông báo"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Text — ẩn trên mobile nhỏ */}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-700">
              {currentUser.username}
            </p>
            <p className="text-xs text-slate-400">
              {ROLE_LABELS[currentUser.role] ?? currentUser.role}
            </p>
          </div>

          {/* Avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {getInitials(currentUser.username)}
          </div>
        </div>
      </div>
    </header>
  );
}
