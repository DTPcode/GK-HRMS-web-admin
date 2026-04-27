// ============================================================================
// GK-HRMS — Notification Store (Zustand v5)
// Quản lý thông báo realtime — polling 30s
// API: json-server localhost:3001
// ============================================================================

import { create } from "zustand";
import { API_BASE } from "@/lib/constants";
import { useAccountStore } from "@/store/accountStore";
import type { Notification, NotificationType, NotificationRecipientType } from "@/types/common";


const nowISO = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface NotificationState {
  notifications: Notification[];
  loading: boolean;

  fetchNotifications: () => Promise<void>;

  createNotification: (data: {
    type: NotificationType;
    title: string;
    message: string;
    recipientType: NotificationRecipientType;
    recipientBranchId: string | null;
    relatedModule: string;
    relatedId: string;
  }) => Promise<void>;

  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  // Computed
  unreadCount: () => number;
}

// ---------------------------------------------------------------------------
// Role-based filter
// ---------------------------------------------------------------------------

function filterForUser(notifications: Notification[]): Notification[] {
  const user = useAccountStore.getState().currentUser;
  if (!user) return [];
  const role = user.role;
  const branchId = user.branchId;

  return notifications.filter((n) => {
    // HR admin / super_admin → see hr_admin notifications
    if ((role === "hr_admin" || role === "super_admin") && n.recipientType === "hr_admin") {
      return true;
    }

    // Branch manager → see branch_manager + specific_branch matching branchId
    if (role === "branch_manager") {
      if (n.recipientType === "branch_manager" && (!n.recipientBranchId || n.recipientBranchId === branchId)) {
        return true;
      }
      if (n.recipientType === "specific_branch" && n.recipientBranchId === branchId) {
        return true;
      }
    }

    // Accountant
    if (role === "accountant" && n.recipientType === "accountant") {
      return true;
    }

    // Director
    if (role === "director" && n.recipientType === "director") {
      return true;
    }

    // Super admin sees everything
    if (role === "super_admin") return true;

    return false;
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,

  fetchNotifications: async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      if (!res.ok) return;
      const all: Notification[] = await res.json();
      const filtered = filterForUser(all);
      // Sort: unread first, then by date
      filtered.sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
      set({ notifications: filtered });
    } catch {
      // Silent — polling shouldn't block UI
    }
  },

  createNotification: async (data) => {
    const newNotif: Notification = {
      id: crypto.randomUUID(),
      ...data,
      isRead: false,
      createdAt: nowISO(),
    };

    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNotif),
      });
      if (res.ok) {
        // Thêm vào local state ngay — bell badge cập nhật tức thời
        const prev = get().notifications;
        set({ notifications: [newNotif, ...prev] });
      }
    } catch {
      // Silent fail — fire-and-forget
    }
  },

  markAsRead: async (id) => {
    const prev = get().notifications;
    // Optimistic update
    set({
      notifications: prev.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    });
    try {
      await fetch(`${API_BASE}/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
    } catch {
      set({ notifications: prev }); // rollback
    }
  },

  markAllAsRead: async () => {
    const prev = get().notifications;
    const unread = prev.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    // Optimistic update
    set({
      notifications: prev.map((n) => ({ ...n, isRead: true })),
    });

    try {
      await Promise.all(
        unread.map((n) =>
          fetch(`${API_BASE}/notifications/${n.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: true }),
          })
        )
      );
    } catch {
      set({ notifications: prev }); // rollback
    }
  },

  deleteNotification: async (id) => {
    const prev = get().notifications;
    set({ notifications: prev.filter((n) => n.id !== id) });
    try {
      await fetch(`${API_BASE}/notifications/${id}`, { method: "DELETE" });
    } catch {
      set({ notifications: prev });
    }
  },

  unreadCount: () => get().notifications.filter((n) => !n.isRead).length,
}));
