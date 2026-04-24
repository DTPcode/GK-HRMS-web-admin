"use client";

// ============================================================================
// GK-HRMS — Sidebar
// Navigation chính bên trái, collapse được, responsive ẩn trên tablet/mobile
// Breakpoint: hidden trên < lg (1024px), hiện trên ≥ lg
// Mobile: overlay sidebar với backdrop
// RBAC: ẩn menu items không có quyền truy cập
// ============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  DollarSign,
  Shield,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { useAccountStore } from "@/store/accountStore";
import type { UserRole } from "@/types/account";

// Map tên icon string → component — vì NAV_ITEMS lưu icon dạng string
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  DollarSign,
  Shield,
  BarChart2,
};

// ---------------------------------------------------------------------------
// Mobile trigger — export để Topbar sử dụng
// ---------------------------------------------------------------------------

/** Global state for mobile sidebar — simple event-based */
let _mobileOpen = false;
const _listeners = new Set<(open: boolean) => void>();

export function toggleMobileSidebar() {
  _mobileOpen = !_mobileOpen;
  _listeners.forEach((fn) => fn(_mobileOpen));
}

function useMobileSidebar() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    _listeners.add(setOpen);
    return () => {
      _listeners.delete(setOpen);
    };
  }, []);

  const close = useCallback(() => {
    _mobileOpen = false;
    _listeners.forEach((fn) => fn(false));
  }, []);

  return { open, close };
}

// ---------------------------------------------------------------------------
// Sidebar Component
// ---------------------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { open: mobileOpen, close: closeMobile } = useMobileSidebar();

  // RBAC: lấy role hiện tại để filter menu items
  const currentRole = useAccountStore((s) => s.currentUser.role);

  // Đóng mobile sidebar khi chuyển route
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  // Filter NAV_ITEMS theo visibleFor của role hiện tại
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // visibleFor = null → hiện cho tất cả roles (Dashboard)
    if (!item.visibleFor) return true;
    // Check role có trong danh sách visibleFor
    return (item.visibleFor as readonly string[]).includes(currentRole);
  });

  // Sidebar content — dùng chung cho desktop và mobile
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
        {!collapsed && (
          <span className="text-lg font-bold text-slate-800">GK-HRMS</span>
        )}
        {/* Desktop: collapse toggle | Mobile: close button */}
        <button
          onClick={() => {
            if (mobileOpen) closeMobile();
            else setCollapsed(!collapsed);
          }}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={
            mobileOpen
              ? "Đóng menu"
              : collapsed
                ? "Mở rộng sidebar"
                : "Thu gọn sidebar"
          }
        >
          {mobileOpen ? (
            <X size={18} />
          ) : collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>

      {/* Nav Items — chỉ hiện items có quyền */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {visibleNavItems.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
              title={collapsed && !mobileOpen ? item.label : undefined}
            >
              {Icon && (
                <Icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-700" : "text-slate-400"
                  )}
                />
              )}
              {(!collapsed || mobileOpen) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {(!collapsed || mobileOpen) && (
        <div className="border-t border-slate-200 p-4">
          <p className="text-xs text-slate-400">© 2024 Gia Khánh</p>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ── Desktop Sidebar (≥ lg) ── */}
      <aside
        className={cn(
          "hidden lg:flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-300",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile/Tablet Overlay Sidebar (< lg) ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeMobile}
          />
          {/* Slide-in sidebar */}
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xl lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
