"use client";

// ============================================================================
// GK-HRMS — PayrollTable
// Bảng lương: columns, status badges, workflow action buttons per row
// Workflow: draft → pending_approval → approved → paid (+ reject → draft)
// ============================================================================

import {
  Eye,
  FileEdit,
  Clock,
  CheckCircle2,
  Banknote,
  XCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { PAYROLL_STATUS_CONFIG } from "@/types/payroll";
import type { PayrollRecord } from "@/types/payroll";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PayrollTableProps {
  records: PayrollRecord[];
  /** Map employeeId → tên NV */
  employeeMap: Map<string, string>;
  /** Map employeeId → phòng ban */
  departmentMap: Map<string, string>;
  /** Xem chi tiết 1 NV */
  onViewBreakdown: (record: PayrollRecord) => void;
  /** Đánh dấu đã chi — approved → paid */
  onMarkAsPaid: (id: string) => void;
  /** Gửi duyệt — draft → pending_approval */
  onSubmitForApproval: (id: string) => void;
  /** Duyệt bảng lương — pending_approval → approved */
  onApprove: (id: string) => void;
  /** Từ chối — pending_approval/approved → draft */
  onReject: (id: string) => void;
  /** Quyền approve (HR, super_admin) */
  canApprove: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sumRecord(rec: Record<string, number>): number {
  return Object.values(rec).reduce((s, v) => s + v, 0);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PayrollTable({
  records,
  employeeMap,
  departmentMap,
  onViewBreakdown,
  onMarkAsPaid,
  onSubmitForApproval,
  onApprove,
  onReject,
  canApprove,
}: PayrollTableProps) {
  // ── Workflow action buttons per row ──
  // Mỗi record hiện action button chính + reject (nếu có quyền).
  // Tách helper function để tránh nested ternary trong JSX.
  function renderActionButtons(r: PayrollRecord): React.ReactNode {
    // draft → gửi duyệt
    if (r.status === "draft") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSubmitForApproval(r.id)}
          className="gap-1.5 text-slate-600 hover:text-slate-800"
        >
          <FileEdit className="h-3.5 w-3.5" />
          Gửi duyệt
        </Button>
      );
    }

    // pending_approval → duyệt + từ chối (nếu có quyền)
    if (r.status === "pending_approval") {
      if (!canApprove) {
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${PAYROLL_STATUS_CONFIG.pending_approval.badgeColor}`}
          >
            <Clock className="h-3 w-3" />
            Chờ duyệt
          </span>
        );
      }
      return (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            onClick={() => onApprove(r.id)}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Duyệt
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(r.id)}
            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <XCircle className="h-3.5 w-3.5" />
            Từ chối
          </Button>
        </div>
      );
    }

    // approved → chi lương + từ chối (nếu có quyền)
    if (r.status === "approved") {
      if (!canApprove) {
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${PAYROLL_STATUS_CONFIG.approved.badgeColor}`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Đã duyệt
          </span>
        );
      }
      return (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            onClick={() => onMarkAsPaid(r.id)}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            <Banknote className="h-3.5 w-3.5" />
            Chi lương
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(r.id)}
            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <XCircle className="h-3.5 w-3.5" />
            Trả lại
          </Button>
        </div>
      );
    }

    // paid → badge tĩnh, không clickable
    if (r.status === "paid") {
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${PAYROLL_STATUS_CONFIG.paid.badgeColor}`}
        >
          <Banknote className="h-3 w-3" />
          Đã chi
        </span>
      );
    }

    return null;
  }

  // ── Empty state ──
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">
          Chưa có dữ liệu
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Nhân viên</TableHead>
              <TableHead className="hidden md:table-cell">Phòng ban</TableHead>
              <TableHead className="hidden text-center md:table-cell">Ngày công</TableHead>
              <TableHead className="hidden text-center lg:table-cell">OT (h)</TableHead>
              <TableHead className="hidden text-right md:table-cell">Lương cơ bản</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Phụ cấp</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Thưởng/Phạt</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Khấu trừ</TableHead>
              <TableHead className="text-right min-w-[120px]">Lương net</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="min-w-[220px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => {
              const empName = employeeMap.get(r.employeeId) ?? r.employeeId;
              const dept = departmentMap.get(r.employeeId) ?? "—";
              const statusCfg = PAYROLL_STATUS_CONFIG[r.status];
              const totalAllowances = sumRecord(r.allowances);
              const totalDeductions = sumRecord(r.deductions);
              const bonusPenalty = r.bonus - r.penalty;

              return (
                <TableRow key={r.id} className="transition-colors">
                  {/* Nhân viên */}
                  <TableCell className="font-medium text-slate-800">
                    {empName}
                  </TableCell>

                  {/* Phòng ban */}
                  <TableCell className="hidden text-sm text-slate-600 md:table-cell">{dept}</TableCell>

                  {/* Ngày công: thực tế/tổng */}
                  <TableCell className="hidden text-center text-sm text-slate-700 md:table-cell">
                    <span className="font-medium">{r.actualWorkDays}</span>
                    <span className="text-slate-400">/{r.totalWorkDays}</span>
                    <span className="ml-0.5 text-xs text-slate-400">ngày</span>
                  </TableCell>

                  {/* OT hours */}
                  <TableCell className="hidden text-center text-sm lg:table-cell">
                    {r.overtimeHours > 0 ? (
                      <span className="font-medium text-amber-600">
                        {r.overtimeHours}h
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>

                  {/* Lương cơ bản */}
                  <TableCell className="hidden text-right text-sm text-slate-700 md:table-cell">
                    {formatCurrency(r.baseSalary)}
                  </TableCell>

                  {/* Phụ cấp */}
                  <TableCell className="hidden text-right text-sm text-emerald-600 lg:table-cell">
                    {totalAllowances > 0
                      ? `+${formatCurrency(totalAllowances)}`
                      : "—"}
                  </TableCell>

                  {/* Thưởng/Phạt */}
                  <TableCell className="hidden text-right text-sm lg:table-cell">
                    {bonusPenalty > 0 ? (
                      <span className="text-emerald-600">
                        +{formatCurrency(bonusPenalty)}
                      </span>
                    ) : bonusPenalty < 0 ? (
                      <span className="text-red-600">
                        {formatCurrency(bonusPenalty)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>

                  {/* Khấu trừ */}
                  <TableCell className="hidden text-right text-sm text-red-600 lg:table-cell">
                    {totalDeductions > 0
                      ? `−${formatCurrency(totalDeductions)}`
                      : "—"}
                  </TableCell>

                  {/* Lương net */}
                  <TableCell className="text-right text-sm font-semibold text-emerald-700">
                    {formatCurrency(r.netSalary)}
                  </TableCell>

                  {/* Trạng thái */}
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusCfg.badgeColor}`}
                    >
                      {statusCfg.label_vi}
                    </span>
                  </TableCell>

                  {/* Actions — luôn hiển thị */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View breakdown — luôn hiện */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewBreakdown(r)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                        aria-label="Xem chi tiết lương"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Workflow action buttons */}
                      {renderActionButtons(r)}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
