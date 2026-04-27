"use client";

// ============================================================================
// GK-HRMS — Topbar
// Header trên cùng: hamburger (mobile), search, RoleSwitcher (DEV), user menu
// Dropdown: user info + đổi mật khẩu + đăng xuất
// ============================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Menu,
  KeyRound,
  LogOut,
  Building2,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ArrowRightLeft,
  UserMinus,
  Calendar,
  DollarSign,
  FileText,
  Award,
  AlertTriangle,
  Check,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAccountStore } from "@/store/accountStore";
import { getInitials } from "@/lib/utils";
import { ROLE_LABELS, ROLE_AVATAR_COLORS } from "@/lib/constants";
import { toggleMobileSidebar } from "@/components/layout/Sidebar";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";
import { getCurrentMockUser, setMockRole, MOCK_USERS } from "@/lib/mockAuth";
import { BRANCH_LIST } from "@/types/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNotificationStore } from "@/store/notificationStore";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { Notification, NotificationType } from "@/types/common";
import { NOTIFICATION_MODULE_ROUTES } from "@/types/common";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBranchName(branchId: string | null): string {
  if (!branchId) return "Toàn chuỗi";
  const branch = BRANCH_LIST.find((b) => b.id === branchId);
  return branch ? branch.name.replace("Gia Khánh - ", "") : branchId;
}

/** Map type prefix → icon component */
function getNotifIcon(type: NotificationType) {
  if (type.startsWith("transfer_")) return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
  if (type.startsWith("resignation_")) return <UserMinus className="h-4 w-4 text-red-600" />;
  if (type.startsWith("leave_") || type.startsWith("supplement_") || type.startsWith("attendance_"))
    return <Calendar className="h-4 w-4 text-amber-600" />;
  if (type.startsWith("payroll_")) return <DollarSign className="h-4 w-4 text-emerald-600" />;
  if (type.startsWith("contract_")) return <FileText className="h-4 w-4 text-orange-600" />;
  if (type.startsWith("reward_")) return <Award className="h-4 w-4 text-yellow-600" />;
  if (type.startsWith("discipline_")) return <AlertTriangle className="h-4 w-4 text-red-600" />;
  return <Bell className="h-4 w-4 text-slate-400" />;
}

function getNotifBg(type: NotificationType) {
  if (type.startsWith("transfer_")) return "bg-blue-50";
  if (type.startsWith("resignation_")) return "bg-red-50";
  if (type.startsWith("leave_") || type.startsWith("supplement_") || type.startsWith("attendance_"))
    return "bg-amber-50";
  if (type.startsWith("payroll_")) return "bg-emerald-50";
  if (type.startsWith("contract_")) return "bg-orange-50";
  if (type.startsWith("reward_")) return "bg-yellow-50";
  if (type.startsWith("discipline_")) return "bg-red-50";
  return "bg-slate-50";
}

function timeAgo(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi });
  } catch {
    return "";
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function Topbar() {
  const currentUser = useAccountStore((s) => s.currentUser);
  const setCurrentUser = useAccountStore((s) => s.setCurrentUser);
  const router = useRouter();

  // Dialog states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {}
  );

  // Sync currentUser từ localStorage khi mount
  useEffect(() => {
    const mockUser = getCurrentMockUser();
    if (mockUser.role !== currentUser.role) {
      setCurrentUser(mockUser);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Role styling
  const avatarColor =
    ROLE_AVATAR_COLORS[currentUser.role] ?? "bg-slate-100 text-slate-700";
  const roleLabel = ROLE_LABELS[currentUser.role] ?? currentUser.role;
  const branchDisplay = currentUser.branchId
    ? getBranchName(currentUser.branchId)
    : null;

  // ── Password validation ────────────────────────────────────────────────

  const validatePassword = (): boolean => {
    const errors: Record<string, string> = {};

    if (!currentPassword.trim()) {
      errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
    }
    if (!newPassword.trim()) {
      errors.newPassword = "Vui lòng nhập mật khẩu mới";
    } else if (newPassword.length < 8) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
    } else if (newPassword === currentPassword) {
      errors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
    }
    if (!confirmPassword.trim()) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setPasswordLoading(true);
    try {
      // Mock: simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      // L5: Verify against MOCK_USERS password
      const mockUser = MOCK_USERS.find((u) => u.id === currentUser.id);
      if (!mockUser || currentPassword !== mockUser.password) {
        setPasswordErrors({
          currentPassword: "Mật khẩu hiện tại không đúng",
        });
        return;
      }

      toast.success("Đổi mật khẩu thành công");
      resetPasswordForm();
      setShowPasswordDialog(false);
    } catch {
      toast.error("Không thể đổi mật khẩu");
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
  };

  // ── Logout ─────────────────────────────────────────────────────────────

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      // 1. Clear auth cookie (middleware reads this)
      document.cookie =
        "mock_current_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC";

      // 2. Clear localStorage
      localStorage.removeItem("mock_current_role");
    }

    toast.success("Đã đăng xuất");
    router.push("/login");
  };

  return (
    <>
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
          {/* DEV: Role Switcher */}
          <RoleSwitcher />

          {/* ── Notification Bell + Dropdown ── */}
          <NotificationBell />

          {/* ── User Dropdown ── */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-50 focus:outline-none sm:gap-3 sm:px-2">
                {/* Text — hidden on small mobile */}
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-slate-700">
                    {currentUser.username}
                  </p>
                  <p className="text-xs text-slate-400">{roleLabel}</p>
                </div>

                {/* Avatar */}
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${avatarColor}`}
                >
                  {getInitials(currentUser.username)}
                </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-[280px] rounded-xl border border-slate-200 p-0 shadow-lg"
            >
              {/* ── Info section ── */}
              <div className="rounded-t-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${avatarColor}`}
                  >
                    {getInitials(currentUser.username)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {currentUser.username}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {/* Branch */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      {branchDisplay
                        ? `Chi nhánh: ${branchDisplay}`
                        : "Phạm vi: Toàn chuỗi"}
                    </span>
                  </div>
                  {/* Role */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Role: {roleLabel}</span>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator className="m-0" />

              {/* ── Menu items ── */}
              <div className="p-1">
                <DropdownMenuItem
                  className="cursor-pointer gap-2.5 rounded-lg px-3 py-2.5 text-sm"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  Đổi mật khẩu
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="m-0" />

              <div className="p-1">
                <DropdownMenuItem
                  className="cursor-pointer gap-2.5 rounded-lg px-3 py-2.5 text-sm text-red-600 focus:bg-red-50 focus:text-red-600"
                  onClick={() => setShowLogoutConfirm(true)}
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          DIALOG: Đổi mật khẩu
          ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showPasswordDialog}
        onOpenChange={(open) => {
          if (!open) resetPasswordForm();
          setShowPasswordDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Đổi mật khẩu
            </DialogTitle>
            <DialogDescription>
              Nhập mật khẩu hiện tại và mật khẩu mới để thay đổi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Current password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Mật khẩu hiện tại <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passwordErrors.currentPassword)
                      setPasswordErrors((p) => ({
                        ...p,
                        currentPassword: "",
                      }));
                  }}
                  placeholder="••••••••"
                  className={`pr-10 text-sm ${passwordErrors.currentPassword ? "border-red-400" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500">
                  <AlertCircle className="h-3 w-3" />{" "}
                  {passwordErrors.currentPassword}
                </p>
              )}
            </div>

            {/* New password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordErrors.newPassword)
                      setPasswordErrors((p) => ({ ...p, newPassword: "" }));
                  }}
                  placeholder="••••••••"
                  className={`pr-10 text-sm ${passwordErrors.newPassword ? "border-red-400" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordErrors.newPassword ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500">
                  <AlertCircle className="h-3 w-3" />{" "}
                  {passwordErrors.newPassword}
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Tối thiểu 8 ký tự
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Xác nhận mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordErrors.confirmPassword)
                      setPasswordErrors((p) => ({
                        ...p,
                        confirmPassword: "",
                      }));
                  }}
                  placeholder="••••••••"
                  className={`pr-10 text-sm ${passwordErrors.confirmPassword ? "border-red-400" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500">
                  <AlertCircle className="h-3 w-3" />{" "}
                  {passwordErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetPasswordForm();
                setShowPasswordDialog(false);
              }}
              disabled={passwordLoading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={passwordLoading}
              className="gap-1.5"
            >
              {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {passwordLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════
          ALERT DIALOG: Xác nhận đăng xuất
          ════════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đăng xuất</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn đăng xuất khỏi hệ thống không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              Đăng xuất
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── NotificationBell Sub-component ──────────────────────────────────────────

function NotificationBell() {
  const router = useRouter();
  const notifications = useNotificationStore((s) => s.notifications);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-fetch on mount + polling 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside → close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const count = unreadCount();
  const displayNotifs = notifications.slice(0, 10);

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif.id);
    setOpen(false);
    const route = NOTIFICATION_MODULE_ROUTES[notif.relatedModule];
    if (route) router.push(route);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Floating Panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[380px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Thông báo</h3>
              {count > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  {count} mới
                </span>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* ── List ── */}
          <div className="max-h-[400px] overflow-auto">
            {displayNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <Bell className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">Không có thông báo nào</p>
              </div>
            ) : (
              displayNotifs.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                    !notif.isRead ? "bg-blue-50/40" : ""
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${getNotifBg(notif.type)}`}
                  >
                    {getNotifIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        notif.isRead
                          ? "text-slate-600"
                          : "font-semibold text-slate-800"
                      }`}
                    >
                      {notif.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                      {notif.message}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-300">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* ── Footer ── */}
          {displayNotifs.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2 text-center">
              <span className="text-xs text-slate-400">
                Hiển thị {displayNotifs.length} / {notifications.length} thông báo
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

