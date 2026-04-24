"use client";

// ============================================================================
// GK-HRMS — ShiftBadge
// Badge hiển thị ca làm việc / trạng thái chấm công trong ô lưới
// ============================================================================

import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/common";

interface ShiftBadgeProps {
  status: AttendanceStatus;
  /** Tên ca (vd: "Sáng", "Chiều", "Gãy") */
  shiftLabel?: string;
  /** Giờ check-in "HH:mm" */
  checkIn?: string | null;
}

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { bg: string; text: string; label: string }
> = {
  present: { bg: "bg-emerald-100", text: "text-emerald-700", label: "✓" },
  absent: { bg: "bg-red-100", text: "text-red-700", label: "✗" },
  late: { bg: "bg-amber-100", text: "text-amber-700", label: "M" },
  early_leave: { bg: "bg-orange-100", text: "text-orange-700", label: "S" },
  on_leave: { bg: "bg-blue-100", text: "text-blue-700", label: "P" },
};

export function ShiftBadge({ status, shiftLabel, checkIn }: ShiftBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded text-xs font-medium",
        config.bg,
        config.text
      )}
      title={`${config.label}${shiftLabel ? ` — ${shiftLabel}` : ""}${
        checkIn ? ` (${checkIn})` : ""
      }`}
    >
      {config.label}
    </div>
  );
}
