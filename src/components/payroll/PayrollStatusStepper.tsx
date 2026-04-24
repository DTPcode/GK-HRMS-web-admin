"use client";

// ============================================================================
// GK-HRMS — PayrollStatusStepper
// Hiển thị flow trạng thái bảng lương: Nháp → Đã tính → Đã duyệt → Đã trả
// ============================================================================

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PayrollStatus } from "@/types/common";

interface PayrollStatusStepperProps {
  currentStatus: PayrollStatus;
}

const STEPS: { status: PayrollStatus; label: string }[] = [
  { status: "draft", label: "Nháp" },
  { status: "calculated", label: "Đã tính" },
  { status: "approved", label: "Đã duyệt" },
  { status: "paid", label: "Đã trả" },
];

/** Map status → step index (rejected = special case) */
function getStepIndex(status: PayrollStatus): number {
  if (status === "rejected") return -1; // Hiển thị đặc biệt
  return STEPS.findIndex((s) => s.status === status);
}

export function PayrollStatusStepper({
  currentStatus,
}: PayrollStatusStepperProps) {
  const currentIndex = getStepIndex(currentStatus);

  if (currentStatus === "rejected") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2">
        <span className="text-sm font-medium text-red-600">
          Bảng lương đã bị từ chối
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.status} className="flex items-center gap-2">
            {/* Step circle */}
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                isCompleted && "bg-emerald-500 text-white",
                isCurrent && "bg-blue-500 text-white",
                !isCompleted && !isCurrent && "bg-slate-200 text-slate-400"
              )}
            >
              {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>

            {/* Label */}
            <span
              className={cn(
                "text-xs font-medium",
                isCompleted && "text-emerald-600",
                isCurrent && "text-blue-600",
                !isCompleted && !isCurrent && "text-slate-400"
              )}
            >
              {step.label}
            </span>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8",
                  index < currentIndex ? "bg-emerald-300" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
