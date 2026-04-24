"use client";

// ============================================================================
// GK-HRMS — StatCard
// Card hiển thị 1 chỉ số thống kê — dùng ở Dashboard
// ============================================================================

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  /** Tên chỉ số (vd: "Tổng nhân viên") */
  title: string;
  /** Giá trị hiển thị (vd: "128" hoặc "12.500.000 ₫") */
  value: string | number;
  /** Icon lucide component */
  icon: LucideIcon;
  /** Phần trăm thay đổi so với kỳ trước (vd: +5.2 hoặc -3.1) */
  change?: number;
  /** Màu chủ đạo của card */
  color?: "blue" | "green" | "amber" | "red" | "purple";
}

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
    change: "text-blue-600",
  },
  green: {
    bg: "bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-600",
    change: "text-emerald-600",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "bg-amber-100 text-amber-600",
    change: "text-amber-600",
  },
  red: {
    bg: "bg-red-50",
    icon: "bg-red-100 text-red-600",
    change: "text-red-600",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "bg-purple-100 text-purple-600",
    change: "text-purple-600",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  color = "blue",
}: StatCardProps) {
  const colors = COLOR_MAP[color];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={cn("rounded-lg p-2.5", colors.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={cn(
              "font-medium",
              change >= 0 ? "text-emerald-600" : "text-red-500"
            )}
          >
            {change >= 0 ? "+" : ""}
            {change}%
          </span>
          <span className="text-slate-400">so với tháng trước</span>
        </div>
      )}
    </div>
  );
}
