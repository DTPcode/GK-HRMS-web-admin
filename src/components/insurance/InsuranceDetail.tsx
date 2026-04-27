"use client";

// ============================================================================
// GK-HRMS — InsuranceDetail
// Bảng chi tiết tỷ lệ + số tiền đóng BH của 1 NV
// ============================================================================

import { Pencil, PauseCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INSURANCE_STATUS_CONFIG } from "@/types/insurance";
import type { InsuranceRecord } from "@/types/insurance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

const pct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InsuranceDetailProps {
  record: InsuranceRecord;
  onEdit?: () => void;
  onSuspend?: () => void;
  onTerminate?: () => void;
  canModify?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InsuranceDetail({
  record,
  onEdit,
  onSuspend,
  onTerminate,
  canModify = false,
}: InsuranceDetailProps) {
  const statusConfig = INSURANCE_STATUS_CONFIG[record.status];

  // Tính từng khoản
  const rows = [
    {
      label: "BHXH",
      empRate: record.bhxhRate,
      erRate: record.bhxhEmployer,
      empAmount: Math.round(record.insuredSalary * record.bhxhRate),
      erAmount: Math.round(record.insuredSalary * record.bhxhEmployer),
    },
    {
      label: "BHYT",
      empRate: record.bhytRate,
      erRate: record.bhytEmployer,
      empAmount: Math.round(record.insuredSalary * record.bhytRate),
      erAmount: Math.round(record.insuredSalary * record.bhytEmployer),
    },
    {
      label: "BHTN",
      empRate: record.bhtnRate,
      erRate: record.bhtnEmployer,
      empAmount: Math.round(record.insuredSalary * record.bhtnRate),
      erAmount: Math.round(record.insuredSalary * record.bhtnEmployer),
    },
  ];

  const totalEmpRate = record.bhxhRate + record.bhytRate + record.bhtnRate;
  const totalErRate = record.bhxhEmployer + record.bhytEmployer + record.bhtnEmployer;
  const totalEmpAmount = rows.reduce((s, r) => s + r.empAmount, 0);
  const totalErAmount = rows.reduce((s, r) => s + r.erAmount, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-slate-800">
            Chi tiết bảo hiểm
          </h3>
          <Badge
            className={cn("text-xs font-medium", statusConfig.badgeColor)}
            variant="outline"
          >
            {statusConfig.label_vi}
          </Badge>
        </div>

        {canModify && record.status === "active" && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Cập nhật
              </Button>
            )}
            {onSuspend && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSuspend}
                className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                Tạm dừng
              </Button>
            )}
            {onTerminate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTerminate}
                className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Ngừng đóng
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="grid grid-cols-2 gap-4 border-b border-slate-100 px-6 py-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-slate-400">Ngày bắt đầu</p>
          <p className="font-medium text-slate-700">{formatDate(record.startDate)}</p>
        </div>
        <div>
          <p className="text-slate-400">Ngày kết thúc</p>
          <p className="font-medium text-slate-700">
            {record.endDate ? formatDate(record.endDate) : "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Lương đóng BH</p>
          <p className="font-medium text-slate-700">{formatVND(record.insuredSalary)}</p>
        </div>
        {record.note && (
          <div>
            <p className="text-slate-400">Ghi chú</p>
            <p className="font-medium text-slate-700">{record.note}</p>
          </div>
        )}
      </div>

      {/* Breakdown Table */}
      <div className="overflow-x-auto px-6 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-3 pr-4 font-medium text-slate-500">Khoản</th>
              <th className="pb-3 px-4 font-medium text-slate-500 text-right">
                Tỷ lệ NLĐ
              </th>
              <th className="pb-3 px-4 font-medium text-slate-500 text-right">
                Tỷ lệ NSDLĐ
              </th>
              <th className="pb-3 px-4 font-medium text-slate-500 text-right">
                NLĐ đóng/tháng
              </th>
              <th className="pb-3 pl-4 font-medium text-slate-500 text-right">
                NSDLĐ đóng/tháng
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="py-3 pr-4 font-medium text-slate-700">
                  {row.label}
                </td>
                <td className="py-3 px-4 text-right text-slate-600">
                  {pct(row.empRate)}
                </td>
                <td className="py-3 px-4 text-right text-slate-600">
                  {pct(row.erRate)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-600">
                  {formatVND(row.empAmount)}
                </td>
                <td className="py-3 pl-4 text-right font-mono text-violet-600">
                  {formatVND(row.erAmount)}
                </td>
              </tr>
            ))}

            {/* Tổng */}
            <tr className="bg-slate-50 font-semibold">
              <td className="py-3 pr-4 text-slate-800">Tổng cộng</td>
              <td className="py-3 px-4 text-right text-slate-800">
                {pct(totalEmpRate)}
              </td>
              <td className="py-3 px-4 text-right text-slate-800">
                {pct(totalErRate)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-emerald-700">
                {formatVND(totalEmpAmount)}
              </td>
              <td className="py-3 pl-4 text-right font-mono text-violet-700">
                {formatVND(totalErAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
