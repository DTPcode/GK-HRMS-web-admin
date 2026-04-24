"use client";

// ============================================================================
// GK-HRMS — SalaryBreakdownModal
// Chi tiết bảng lương 1 NV: breakdown từng khoản (+) (−) = Net
// ============================================================================

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type { PayrollRecord } from "@/types/payroll";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SalaryBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PayrollRecord | null;
  /** Tên nhân viên — đã join từ orchestrator */
  employeeName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sumRecord(rec: Record<string, number>): number {
  return Object.values(rec).reduce((s, v) => s + v, 0);
}

/** Map allowance key → label tiếng Việt */
const ALLOWANCE_LABELS: Record<string, string> = {
  xe: "Phụ cấp xăng xe",
  com: "Phụ cấp cơm",
  dien_thoai: "Phụ cấp điện thoại",
  chuc_vu: "Phụ cấp chức vụ",
  doc_hai: "Phụ cấp độc hại",
  nha_o: "Phụ cấp nhà ở",
};

/** Map deduction key → label tiếng Việt */
const DEDUCTION_LABELS: Record<string, string> = {
  BHXH: "Bảo hiểm xã hội",
  BHYT: "Bảo hiểm y tế",
  BHTN: "Bảo hiểm thất nghiệp",
  TNCN: "Thuế TNCN",
  tamung: "Tạm ứng",
  cong_doan: "Phí công đoàn",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SalaryBreakdownModal({
  open,
  onOpenChange,
  record,
  employeeName,
}: SalaryBreakdownModalProps) {
  if (!record) return null;

  const totalAllowances = sumRecord(record.allowances);
  const totalDeductions = sumRecord(record.deductions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chi tiết lương — {employeeName}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-1">
          {/* Header info */}
          <div className="mb-4 flex justify-between text-sm text-slate-500">
            <span>Kỳ lương: {record.month}</span>
            <span>
              Ngày công: {record.actualWorkDays}/{record.totalWorkDays} ngày
            </span>
          </div>

          {/* ── Breakdown Table ── */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {/* (+) Lương cơ bản */}
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    (+) Lương cơ bản
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                    {formatCurrency(record.baseSalary)}
                  </td>
                </tr>

                {/* (+) Phụ cấp — liệt kê từng khoản */}
                {Object.entries(record.allowances).length > 0 && (
                  <>
                    <tr className="border-b border-slate-100">
                      <td
                        colSpan={2}
                        className="bg-blue-50/50 px-4 py-1.5 text-xs font-semibold text-blue-700 uppercase tracking-wide"
                      >
                        (+) Phụ cấp
                      </td>
                    </tr>
                    {Object.entries(record.allowances).map(([key, value]) => (
                      <tr key={key} className="border-b border-slate-50">
                        <td className="px-4 py-2 pl-8 text-slate-600">
                          {ALLOWANCE_LABELS[key] ?? key}
                        </td>
                        <td className="px-4 py-2 text-right text-emerald-600">
                          +{formatCurrency(value)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="px-4 py-2 pl-8 font-medium text-slate-600">
                        Tổng phụ cấp
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-emerald-700">
                        +{formatCurrency(totalAllowances)}
                      </td>
                    </tr>
                  </>
                )}

                {/* (+) Thưởng */}
                {record.bonus > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-700">
                      (+) Thưởng
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">
                      +{formatCurrency(record.bonus)}
                    </td>
                  </tr>
                )}

                {/* (-) Phạt */}
                {record.penalty > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-700">
                      (−) Phạt
                    </td>
                    <td className="px-4 py-2.5 text-right text-red-600">
                      −{formatCurrency(record.penalty)}
                    </td>
                  </tr>
                )}

                {/* (+) Lương OT */}
                {record.overtimePay > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-700">
                      (+) Lương OT ({record.overtimeHours}h)
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">
                      +{formatCurrency(record.overtimePay)}
                    </td>
                  </tr>
                )}

                {/* = Gross */}
                <tr className="border-b border-slate-200 bg-slate-100">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">
                    Tổng thu nhập (Gross)
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                    {formatCurrency(record.grossSalary)}
                  </td>
                </tr>

                {/* (−) Khấu trừ — liệt kê từng khoản */}
                {Object.entries(record.deductions).length > 0 && (
                  <>
                    <tr className="border-b border-slate-100">
                      <td
                        colSpan={2}
                        className="bg-red-50/50 px-4 py-1.5 text-xs font-semibold text-red-700 uppercase tracking-wide"
                      >
                        (−) Khấu trừ
                      </td>
                    </tr>
                    {Object.entries(record.deductions).map(([key, value]) => (
                      <tr key={key} className="border-b border-slate-50">
                        <td className="px-4 py-2 pl-8 text-slate-600">
                          {DEDUCTION_LABELS[key] ?? key}
                        </td>
                        <td className="px-4 py-2 text-right text-red-600">
                          −{formatCurrency(value)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="px-4 py-2 pl-8 font-medium text-slate-600">
                        Tổng khấu trừ
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-red-700">
                        −{formatCurrency(totalDeductions)}
                      </td>
                    </tr>
                  </>
                )}

                {/* ═══ NET SALARY ═══ */}
                <tr className="bg-emerald-50">
                  <td className="px-4 py-3 text-base font-bold text-emerald-800">
                    Thực lĩnh (Net)
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-emerald-700">
                    {formatCurrency(record.netSalary)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Note */}
          {record.note && (
            <div className="mt-3 rounded-lg bg-slate-50 px-4 py-2.5">
              <p className="text-xs font-medium text-slate-500">Ghi chú</p>
              <p className="mt-0.5 text-sm text-slate-700">{record.note}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
