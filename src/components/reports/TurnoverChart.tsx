"use client";

// ============================================================================
// GK-HRMS — TurnoverChart (Báo Cáo Chấm Công)
// Tab 3: Thống kê chấm công theo tháng + phòng ban
// Highlight NV có >3 ngày vắng
// ============================================================================

import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataExportButton } from "@/components/shared/DataExportButton";
import { useAttendanceStore } from "@/store/attendanceStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { formatMonth } from "@/lib/utils";
import type { AttendanceRecord } from "@/types/attendance";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEPARTMENTS = [
  "Tất cả",
  "Bếp",
  "Phục vụ",
  "Thu ngân",
  "Quản lý cửa hàng",
  "HR",
  "Kế toán",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttendanceSummaryRow {
  employeeId: string;
  employeeName: string;
  department: string;
  workDays: number;
  leaveDays: number;
  absentDays: number;
  totalOT: number;
  presentOnTime: number;
  totalRecords: number;
  onTimePercent: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TurnoverChart() {
  const { records: attRecords } = useAttendanceStore();
  const { employees } = useEmployeeStore();

  // ── Fetch data ──
  useEffect(() => {
    if (attRecords.length === 0) {
      useAttendanceStore.getState().fetchAttendance();
    }
    if (employees.length === 0) {
      useEmployeeStore.getState().fetchEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filter state ──
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [selectedDept, setSelectedDept] = useState("Tất cả");

  // ── Employee maps ──
  const empNameMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees]
  );
  const empDeptMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.department])),
    [employees]
  );

  // ── Compute attendance summary per employee ──
  const summaryRows = useMemo<AttendanceSummaryRow[]>(() => {
    // Filter records by month
    const monthRecords = attRecords.filter((r) =>
      r.date.startsWith(selectedMonth)
    );

    // Group by employee
    const byEmp = new Map<string, AttendanceRecord[]>();
    for (const r of monthRecords) {
      if (!byEmp.has(r.employeeId)) byEmp.set(r.employeeId, []);
      byEmp.get(r.employeeId)!.push(r);
    }

    const rows: AttendanceSummaryRow[] = [];

    for (const [empId, recs] of byEmp) {
      const dept = empDeptMap.get(empId) ?? "Không xác định";

      // Filter by department
      if (selectedDept !== "Tất cả" && dept !== selectedDept) continue;

      let workDays = 0;
      let leaveDays = 0;
      let absentDays = 0;
      let totalOT = 0;
      let presentOnTime = 0;

      for (const r of recs) {
        if (r.status === "present" || r.status === "late") workDays++;
        if (r.status === "leave") leaveDays++;
        if (r.status === "absent") absentDays++;
        totalOT += r.overtimeHours;
        if (r.status === "present" && r.lateMinutes === 0) presentOnTime++;
      }

      const totalRecords = recs.filter(
        (r) => r.status !== "holiday"
      ).length;

      rows.push({
        employeeId: empId,
        employeeName: empNameMap.get(empId) ?? empId,
        department: dept,
        workDays,
        leaveDays,
        absentDays,
        totalOT,
        presentOnTime,
        totalRecords: totalRecords || 1,
        onTimePercent:
          totalRecords > 0
            ? Math.round((presentOnTime / totalRecords) * 100)
            : 0,
      });
    }

    return rows.sort((a, b) => b.absentDays - a.absentDays);
  }, [attRecords, selectedMonth, selectedDept, empNameMap, empDeptMap]);

  // ── Month navigation ──
  const adjustMonth = (dir: -1 | 1) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(format(d, "yyyy-MM"));
  };

  // ── Export data ──
  const exportData = useMemo(
    () =>
      summaryRows.map((r) => ({
        "Nhân viên": r.employeeName,
        "Phòng ban": r.department,
        "Ngày công": r.workDays,
        "Ngày nghỉ phép": r.leaveDays,
        "Ngày vắng": r.absentDays,
        "Tổng OT (h)": r.totalOT,
        "% đúng giờ": `${r.onTimePercent}%`,
      })),
    [summaryRows]
  );

  return (
    <div className="space-y-4">
      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Month picker */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Tháng:</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => adjustMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[80px] text-center text-sm font-medium text-slate-700">
            {formatMonth(selectedMonth + "-01")}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => adjustMonth(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Department filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Phòng ban:</span>
          <Select value={selectedDept} onValueChange={(val) => { if (val) setSelectedDept(val); }}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto">
          <DataExportButton
            label="Xuất Excel"
            data={exportData}
            filename={`GK-HRMS-BaoCao-ChamCong-${selectedMonth}`}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Nhân viên</TableHead>
              <TableHead>Phòng ban</TableHead>
              <TableHead className="text-center">Ngày công</TableHead>
              <TableHead className="text-center">Nghỉ phép</TableHead>
              <TableHead className="text-center">Vắng</TableHead>
              <TableHead className="text-center">OT (h)</TableHead>
              <TableHead className="text-center">% Đúng giờ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaryRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-slate-400"
                >
                  Chưa có dữ liệu chấm công cho tháng này.
                </TableCell>
              </TableRow>
            ) : (
              summaryRows.map((r) => {
                const isHighAbsent = r.absentDays > 3;
                return (
                  <TableRow
                    key={r.employeeId}
                    className={isHighAbsent ? "bg-red-50" : ""}
                  >
                    <TableCell className="font-medium text-slate-800">
                      {r.employeeName}
                      {isHighAbsent && (
                        <span className="ml-1.5 text-[10px] text-red-500">
                          ⚠ Vắng nhiều
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {r.department}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium text-slate-700">
                      {r.workDays}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {r.leaveDays > 0 ? (
                        <span className="text-blue-600">{r.leaveDays}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {r.absentDays > 0 ? (
                        <span className={`font-medium ${isHighAbsent ? "text-red-600" : "text-amber-600"}`}>
                          {r.absentDays}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {r.totalOT > 0 ? (
                        <span className="text-amber-600">{r.totalOT}h</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.onTimePercent >= 90
                            ? "bg-emerald-100 text-emerald-700"
                            : r.onTimePercent >= 70
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.onTimePercent}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
