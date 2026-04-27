"use client";

// ============================================================================
// GK-HRMS — PayrollPanel
// Tab Lương trong trang chi tiết nhân viên
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import { DollarSign, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePayrollStore } from "@/store/payrollStore";
import { formatCurrency } from "@/lib/utils";
import { PAYROLL_STATUS_CONFIG } from "@/types/payroll";
import { Button } from "@/components/ui/button";

interface PayrollPanelProps {
  employeeId: string;
}

export function PayrollPanel({ employeeId }: PayrollPanelProps) {
  const payrollRecords = usePayrollStore((s) => s.records);
  const loading = usePayrollStore((s) => s.loading);
  const error = usePayrollStore((s) => s.error);
  const fetchPayroll = usePayrollStore((s) => s.fetchPayroll);

  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    fetchPayroll().finally(() => setFetched(true));
  }, [fetchPayroll]);

  const empPayroll = useMemo(
    () =>
      payrollRecords
        .filter((p) => p.employeeId === employeeId)
        .sort((a, b) => b.month.localeCompare(a.month)),
    [payrollRecords, employeeId]
  );

  // Summary
  const summary = useMemo(() => {
    if (empPayroll.length === 0) return null;
    const latest = empPayroll[0];
    const last3 = empPayroll.slice(0, 3);
    const avg3 =
      last3.reduce((s, p) => s + p.netSalary, 0) / last3.length;
    return { latestNet: latest.netSalary, avg3: Math.round(avg3) };
  }, [empPayroll]);

  if (!fetched || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-red-500 mb-2">{error}</p>
        <Button size="sm" variant="outline" onClick={() => fetchPayroll()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Thực lĩnh gần nhất</p>
            <p className="mt-1 text-lg font-bold text-emerald-600">
              {formatCurrency(summary.latestNet)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Trung bình 3 tháng</p>
            <p className="mt-1 text-lg font-bold text-slate-800">
              {formatCurrency(summary.avg3)}
            </p>
          </div>
        </div>
      )}

      {empPayroll.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <DollarSign className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Chưa có dữ liệu lương</p>
        </div>
      ) : (
        <div className="space-y-3">
          {empPayroll.map((p) => {
            const cfg = PAYROLL_STATUS_CONFIG[p.status];
            const totalAllowances = Object.values(p.allowances).reduce(
              (s, v) => s + v,
              0
            );
            const totalDeductions = Object.values(p.deductions).reduce(
              (s, v) => s + v,
              0
            );
            const [y, m] = p.month.split("-");
            return (
              <div
                key={p.id}
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        Kỳ lương: {parseInt(m)}/{y}
                      </span>
                      <Badge className={`text-[10px] ${cfg.badgeColor}`}>
                        {cfg.label_vi}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
                      <span>Lương cơ bản: {formatCurrency(p.baseSalary)}</span>
                      <span>Phụ cấp: {formatCurrency(totalAllowances)}</span>
                      <span>Thưởng: {formatCurrency(p.bonus)}</span>
                      <span>Khấu trừ: {formatCurrency(totalDeductions)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Thực lĩnh</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {formatCurrency(p.netSalary)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
