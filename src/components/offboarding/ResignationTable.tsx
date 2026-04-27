"use client";

// ============================================================================
// GK-HRMS — ResignationTable
// Bảng danh sách đơn nghỉ việc
// Row đỏ nhạt nếu lastWorkingDate < today (quá hạn)
// ============================================================================

import { Check, X, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  RESIGNATION_TYPE_CONFIG,
  RESIGNATION_STATUS_CONFIG,
} from "@/types/offboarding";
import type { ResignationRequest } from "@/types/offboarding";
import { useEmployeeStore } from "@/store/employeeStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResignationTableProps {
  requests: ResignationRequest[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onComplete?: (request: ResignationRequest) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResignationTable({
  requests,
  onApprove,
  onReject,
  onComplete,
}: ResignationTableProps) {
  const employees = useEmployeeStore((s) => s.employees);
  const today = new Date().toISOString().slice(0, 10);

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-slate-500">Không có đơn nghỉ việc nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="px-4 py-3 font-medium text-slate-500">Nhân viên</th>
            <th className="px-4 py-3 font-medium text-slate-500">Loại</th>
            <th className="px-4 py-3 font-medium text-slate-500">Ngày nộp đơn</th>
            <th className="px-4 py-3 font-medium text-slate-500">Ngày làm cuối</th>
            <th className="px-4 py-3 font-medium text-slate-500">Lý do</th>
            <th className="px-4 py-3 font-medium text-slate-500">Trạng thái</th>
            <th className="px-4 py-3 font-medium text-slate-500">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => {
            const emp = employees.find((e) => e.id === req.employeeId);
            const typeConfig = RESIGNATION_TYPE_CONFIG[req.type];
            const statusConfig = RESIGNATION_STATUS_CONFIG[req.status];
            const isOverdue =
              req.lastWorkingDate < today &&
              (req.status === "pending" || req.status === "approved");

            return (
              <tr
                key={req.id}
                className={cn(
                  "border-b border-slate-100 transition-colors",
                  isOverdue
                    ? "bg-red-50/60 hover:bg-red-50"
                    : "hover:bg-slate-50"
                )}
              >
                {/* Nhân viên */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800">
                      {emp?.name ?? req.employeeId}
                    </p>
                    <p className="text-xs text-slate-400">
                      {emp?.department ?? ""} — {emp?.position ?? ""}
                    </p>
                  </div>
                </td>

                {/* Loại */}
                <td className="px-4 py-3 text-slate-600">
                  {typeConfig.label_vi}
                </td>

                {/* Ngày nộp đơn */}
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(req.submittedDate)}
                </td>

                {/* Ngày làm cuối */}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-slate-600",
                      isOverdue && "font-medium text-red-600"
                    )}
                  >
                    {formatDate(req.lastWorkingDate)}
                  </span>
                  {isOverdue && (
                    <span className="ml-1 text-xs text-red-500">⏰ Quá hạn</span>
                  )}
                </td>

                {/* Lý do */}
                <td className="px-4 py-3 max-w-[200px] truncate text-slate-600">
                  {req.reason}
                </td>

                {/* Trạng thái */}
                <td className="px-4 py-3">
                  <Badge
                    className={cn("text-xs font-medium", statusConfig.badgeColor)}
                    variant="outline"
                  >
                    {statusConfig.label_vi}
                  </Badge>
                </td>

                {/* Thao tác */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {req.status === "pending" && (
                      <>
                        {onApprove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onApprove(req.id)}
                            className="h-8 gap-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Duyệt
                          </Button>
                        )}
                        {onReject && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReject(req.id)}
                            className="h-8 gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <X className="h-3.5 w-3.5" />
                            Từ chối
                          </Button>
                        )}
                      </>
                    )}
                    {req.status === "approved" && onComplete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onComplete(req)}
                        className="h-8 gap-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Hoàn tất bàn giao
                      </Button>
                    )}
                    {(req.status === "completed" || req.status === "rejected") && (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
