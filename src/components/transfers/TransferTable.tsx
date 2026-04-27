"use client";

// ============================================================================
// GK-HRMS — TransferTable (v2 — phase-based)
// Renders transfers with phase badges and action buttons
// ============================================================================

import { Send, CheckCircle, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Transfer } from "@/types/employee";
import {
  BRANCH_LIST,
  TRANSFER_REQUEST_TYPE_CONFIG,
  TRANSFER_DIRECTION_CONFIG,
  TRANSFER_PHASE_CONFIG,
} from "@/types/employee";

interface Props {
  transfers: Transfer[];
  /** Which actions to show — depends on tab + role */
  actions?: {
    onDispatch?: (t: Transfer) => void;
    onRespond?: (t: Transfer) => void;
    onExecute?: (t: Transfer) => void;
    onComplete?: (t: Transfer) => void;
    onDelete?: (t: Transfer) => void;
    onView?: (t: Transfer) => void;
  };
  /** Extra columns to show */
  showColumns?: {
    sourceBranch?: boolean;
    employee?: boolean;
    hrNote?: boolean;
  };
}

function branchName(id: string | null): string {
  if (!id) return "—";
  return BRANCH_LIST.find((b) => b.id === id)?.name.replace("Gia Khánh - ", "") ?? id;
}

export function TransferTable({ transfers, actions, showColumns }: Props) {
  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Send className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">Chưa có dữ liệu</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Loại</th>
            <th className="px-4 py-3 text-left">Hướng</th>
            <th className="px-4 py-3 text-left">Vị trí cần</th>
            <th className="px-4 py-3 text-center">SL</th>
            {showColumns?.sourceBranch && (
              <th className="px-4 py-3 text-left">CN nguồn</th>
            )}
            {showColumns?.employee && (
              <th className="px-4 py-3 text-left">Nhân viên</th>
            )}
            {showColumns?.hrNote && (
              <th className="px-4 py-3 text-left">Ghi chú HR</th>
            )}
            <th className="px-4 py-3 text-left">Chi nhánh đề xuất</th>
            <th className="px-4 py-3 text-left">Trạng thái</th>
            <th className="px-4 py-3 text-left">Ngày tạo</th>
            {actions && <th className="px-4 py-3 text-right">Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => {
            const typeConfig = TRANSFER_REQUEST_TYPE_CONFIG[t.type];
            const dirConfig = TRANSFER_DIRECTION_CONFIG[t.direction];
            const phaseConfig = TRANSFER_PHASE_CONFIG[t.phase];

            return (
              <tr
                key={t.id}
                className="border-t border-slate-100 transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeConfig.badgeColor}`}
                  >
                    {typeConfig.label_vi}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${dirConfig.badgeColor}`}
                  >
                    {dirConfig.label_vi}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {t.requiredPosition}
                </td>
                <td className="px-4 py-3 text-center text-slate-600">
                  {t.requiredQuantity}
                </td>
                {showColumns?.sourceBranch && (
                  <td className="px-4 py-3 text-slate-600">
                    {branchName(t.sourceBranchId)}
                  </td>
                )}
                {showColumns?.employee && (
                  <td className="px-4 py-3 text-slate-700">
                    {t.employeeName ?? "—"}
                  </td>
                )}
                {showColumns?.hrNote && (
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-500">
                    {t.hrDispatchNote ?? "—"}
                  </td>
                )}
                <td className="px-4 py-3 text-slate-600">
                  {branchName(t.requestedByBranchId)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${phaseConfig.badgeColor}`}
                  >
                    {phaseConfig.label_vi}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                </td>
                {actions && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {actions.onDispatch && t.phase === "requested" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actions.onDispatch!(t)}
                          className="h-7 gap-1 text-xs"
                        >
                          <Send className="h-3 w-3" />
                          Điều phối
                        </Button>
                      )}
                      {actions.onRespond &&
                        t.phase === "pending_source_approval" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => actions.onRespond!(t)}
                            className="h-7 gap-1 border-orange-200 text-xs text-orange-600 hover:bg-orange-50"
                          >
                            <Eye className="h-3 w-3" />
                            Phản hồi
                          </Button>
                        )}
                      {actions.onExecute && t.phase === "approved" && (
                        <Button
                          size="sm"
                          onClick={() => actions.onExecute!(t)}
                          className="h-7 gap-1 bg-green-600 text-xs hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Xác nhận
                        </Button>
                      )}
                      {actions.onComplete && t.phase === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actions.onComplete!(t)}
                          className="h-7 gap-1 text-xs"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Hoàn tất
                        </Button>
                      )}
                      {actions.onDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                          onClick={() => actions.onDelete!(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
