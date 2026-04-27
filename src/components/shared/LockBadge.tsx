"use client";

// ============================================================================
// GK-HRMS — LockBadge
// Badge hiển thị trạng thái khóa/mở kỳ dữ liệu
// Dùng chung trong: AttendancePageClient, PayrollPageClient
// ============================================================================

import { Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSupplementStore } from "@/store/supplementStore";
import type { LockType } from "@/types/supplement";

interface LockBadgeProps {
  type: LockType;
  period: string;
}

export function LockBadge({ type, period }: LockBadgeProps) {
  const isLocked = useSupplementStore((s) => s.isLocked);
  const locked = isLocked(type, period);

  if (locked) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-red-200 bg-red-50 text-red-600"
      >
        <Lock className="h-3 w-3" />
        Đã khóa
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-600"
    >
      <Unlock className="h-3 w-3" />
      Đang mở
    </Badge>
  );
}
