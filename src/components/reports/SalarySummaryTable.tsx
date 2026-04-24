"use client";

// ============================================================================
// GK-HRMS — SalarySummaryTable
// Tab 2: Thống kê lương theo phòng ban — filter theo month range
// ============================================================================

import { useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DataExportButton } from "@/components/shared/DataExportButton";
import { usePayrollStore } from "@/store/payrollStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { formatCurrency, formatMonth } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeptSalary {
  department: string;
  headCount: number;
  avgSalary: number;
  minSalary: number;
  maxSalary: number;
  totalFund: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SalarySummaryTable() {
  const { records } = usePayrollStore();
  const { employees } = useEmployeeStore();

  // ── Month range filter ──
  const nowMonth = format(new Date(), "yyyy-MM");
  const [fromMonth, setFromMonth] = useState(
    format(subMonths(new Date(), 2), "yyyy-MM")
  );
  const [toMonth, setToMonth] = useState(nowMonth);

  // ── Employee → department map ──
  const empDeptMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.department])),
    [employees]
  );

  // ── Filter records by month range ──
  const filteredRecords = useMemo(
    () => records.filter((r) => r.month >= fromMonth && r.month <= toMonth),
    [records, fromMonth, toMonth]
  );

  // ── Aggregate by department ──
  const deptSalaries = useMemo<DeptSalary[]>(() => {
    const map = new Map<
      string,
      { salaries: number[]; total: number; count: number }
    >();

    for (const r of filteredRecords) {
      const dept = empDeptMap.get(r.employeeId) ?? "Không xác định";
      if (!map.has(dept)) {
        map.set(dept, { salaries: [], total: 0, count: 0 });
      }
      const entry = map.get(dept)!;
      entry.salaries.push(r.netSalary);
      entry.total += r.netSalary;
      entry.count++;
    }

    return Array.from(map, ([department, data]) => ({
      department,
      headCount: data.count,
      avgSalary: Math.round(data.total / data.count),
      minSalary: Math.min(...data.salaries),
      maxSalary: Math.max(...data.salaries),
      totalFund: data.total,
    })).sort((a, b) => b.totalFund - a.totalFund);
  }, [filteredRecords, empDeptMap]);

  // ── Totals ──
  const grandTotal = deptSalaries.reduce((s, d) => s + d.totalFund, 0);

  // ── Export data ──
  const exportData = useMemo(
    () =>
      deptSalaries.map((d) => ({
        "Phòng ban": d.department,
        "Số lượng": d.headCount,
        "Lương TB": d.avgSalary,
        "Lương min": d.minSalary,
        "Lương max": d.maxSalary,
        "Tổng quỹ lương": d.totalFund,
      })),
    [deptSalaries]
  );

  // ── Month nav helpers ──
  const adjustMonth = (
    current: string,
    dir: -1 | 1
  ) => {
    const [y, m] = current.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    return format(d, "yyyy-MM");
  };

  return (
    <div className="space-y-4">
      {/* ── Month range filter ── */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Từ:</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setFromMonth(adjustMonth(fromMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[80px] text-center text-sm font-medium text-slate-700">
            {formatMonth(fromMonth + "-01")}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setFromMonth(adjustMonth(fromMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Đến:</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setToMonth(adjustMonth(toMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[80px] text-center text-sm font-medium text-slate-700">
            {formatMonth(toMonth + "-01")}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setToMonth(adjustMonth(toMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-auto">
          <DataExportButton
            label="Xuất Excel"
            data={exportData}
            filename={`GK-HRMS-BaoCao-Luong-${fromMonth}-${toMonth}`}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phòng ban</TableHead>
              <TableHead className="text-center">Số lượng</TableHead>
              <TableHead className="text-right">Lương TB</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">Max</TableHead>
              <TableHead className="text-right">Tổng quỹ lương</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deptSalaries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-slate-400"
                >
                  Chưa có dữ liệu lương cho khoảng thời gian này.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {deptSalaries.map((d) => (
                  <TableRow key={d.department}>
                    <TableCell className="font-medium text-slate-800">
                      {d.department}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {d.headCount}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-700">
                      {formatCurrency(d.avgSalary)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-500">
                      {formatCurrency(d.minSalary)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-500">
                      {formatCurrency(d.maxSalary)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-emerald-700">
                      {formatCurrency(d.totalFund)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Grand total row */}
                <TableRow className="bg-slate-50 font-semibold">
                  <TableCell className="text-slate-800">Tổng cộng</TableCell>
                  <TableCell className="text-center text-sm">
                    {deptSalaries.reduce((s, d) => s + d.headCount, 0)}
                  </TableCell>
                  <TableCell colSpan={3} />
                  <TableCell className="text-right text-emerald-700">
                    {formatCurrency(grandTotal)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
