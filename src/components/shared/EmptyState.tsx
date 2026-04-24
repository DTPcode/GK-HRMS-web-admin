"use client";

// ============================================================================
// GK-HRMS — EmptyState
// Hiển thị khi danh sách rỗng — icon + message + optional action
// ============================================================================

import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  /** Icon — default Inbox */
  icon?: LucideIcon;
  /** Tiêu đề (vd: "Chưa có nhân viên nào") */
  title: string;
  /** Mô tả phụ */
  description?: string;
  /** Text nút action (vd: "Thêm nhân viên") */
  actionLabel?: string;
  /** Callback khi nhấn action */
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-slate-100 p-4">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
