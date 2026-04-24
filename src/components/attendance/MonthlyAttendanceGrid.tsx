"use client";

// ============================================================================
// GK-HRMS — MonthlyAttendanceGrid
// Grid chấm công tháng: rows = NV, cols = ngày (1-31)
// Mỗi ô hiển thị trạng thái theo màu + label tương ứng
// ============================================================================

import { useMemo } from "react";
import { format, parseISO, getDaysInMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MonthlyAttendanceGridProps {
  records: AttendanceRecord[];
  selectedMonth: string; // "YYYY-MM"
  /** Map employeeId → tên NV */
  employeeMap: Map<string, string>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

// ---------------------------------------------------------------------------
// Cell config
// ---------------------------------------------------------------------------

const CELL_CONFIG: Record<
  AttendanceStatus,
  { bg: string; text: string; label: string }
> = {
  present: { bg: "bg-emerald-100", text: "text-emerald-700", label: "" },
  late: { bg: "bg-amber-100", text: "text-amber-700", label: "" },
  absent: { bg: "bg-red-100", text: "text-red-600", label: "V" },
  leave: { bg: "bg-blue-100", text: "text-blue-700", label: "P" },
  holiday: { bg: "bg-slate-200", text: "text-slate-600", label: "L" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonthlyAttendanceGrid({
  records,
  selectedMonth,
  employeeMap,
  onPrevMonth,
  onNextMonth,
}: MonthlyAttendanceGridProps) {
  // Parse month
  const monthDate = parseISO(`${selectedMonth}-01`);
  const daysInMonth = getDaysInMonth(monthDate);
  const monthLabel = format(monthDate, "'Tháng' MM/yyyy", { locale: vi });

  // Group records by employeeId → date
  const gridData = useMemo(() => {
    // Only records in this month
    const monthRecords = records.filter((r) =>
      r.date.startsWith(selectedMonth)
    );

    // Group: empId → { day: record }
    const map = new Map<string, Map<number, AttendanceRecord>>();
    for (const r of monthRecords) {
      const day = parseInt(r.date.split("-")[2], 10);
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, new Map());
      }
      map.get(r.employeeId)!.set(day, r);
    }
    return map;
  }, [records, selectedMonth]);

  // Unique employees in data
  const employeeIds = useMemo(() => {
    return Array.from(gridData.keys());
  }, [gridData]);

  // Summary row: count per status per employee
  const employeeSummaries = useMemo(() => {
    const summaries = new Map<
      string,
      Record<AttendanceStatus, number>
    >();
    for (const [empId, dayMap] of gridData) {
      const counts: Record<AttendanceStatus, number> = {
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        holiday: 0,
      };
      for (const r of dayMap.values()) {
        counts[r.status]++;
      }
      summaries.set(empId, counts);
    }
    return summaries;
  }, [gridData]);

  // Day columns
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Check if day is weekend (Sat/Sun)
  const isWeekend = (day: number) => {
    const date = new Date(
      parseInt(selectedMonth.split("-")[0]),
      parseInt(selectedMonth.split("-")[1]) - 1,
      day
    );
    const dow = date.getDay();
    return dow === 0 || dow === 6;
  };

  return (
    <div className="space-y-4">
      {/* Month picker */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onPrevMonth} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[160px] text-center text-sm font-semibold text-slate-800">
          {monthLabel}
        </span>
        <Button variant="outline" size="sm" onClick={onNextMonth} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Empty state */}
      {employeeIds.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Chưa có dữ liệu chấm công cho tháng này.
          </p>
        </div>
      )}

      {/* Grid table */}
      {employeeIds.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="sticky top-0 z-10 bg-slate-50">
                  <th className="sticky left-0 z-20 min-w-[140px] border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700">
                    Nhân viên
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      className={cn(
                        "min-w-[36px] border-b border-slate-200 px-1 py-2 text-center font-medium",
                        isWeekend(d) ? "bg-slate-100 text-slate-400" : "text-slate-600"
                      )}
                    >
                      {d}
                    </th>
                  ))}
                  {/* Summary columns */}
                  <th className="min-w-[32px] border-b border-l border-slate-200 bg-emerald-50 px-1 py-2 text-center text-emerald-700" title="Có mặt">
                    ✓
                  </th>
                  <th className="min-w-[32px] border-b border-slate-200 bg-amber-50 px-1 py-2 text-center text-amber-700" title="Đi muộn">
                    ⏰
                  </th>
                  <th className="min-w-[32px] border-b border-slate-200 bg-red-50 px-1 py-2 text-center text-red-600" title="Vắng">
                    V
                  </th>
                  <th className="min-w-[32px] border-b border-slate-200 bg-blue-50 px-1 py-2 text-center text-blue-700" title="Nghỉ phép">
                    P
                  </th>
                </tr>
              </thead>
              <tbody>
                {employeeIds.map((empId) => {
                  const dayMap = gridData.get(empId)!;
                  const empName = employeeMap.get(empId) ?? empId;
                  const summary = employeeSummaries.get(empId)!;

                  return (
                    <tr key={empId} className="hover:bg-slate-50/50">
                      <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800">
                        <span className="truncate" title={empName}>
                          {empName}
                        </span>
                      </td>
                      {days.map((d) => {
                        const record = dayMap.get(d);
                        const weekend = isWeekend(d);

                        if (!record) {
                          return (
                            <td
                              key={d}
                              className={cn(
                                "border-b border-slate-100 px-1 py-1.5 text-center",
                                weekend ? "bg-slate-50" : ""
                              )}
                            >
                              {weekend && (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        }

                        const cfg = CELL_CONFIG[record.status];
                        return (
                          <td
                            key={d}
                            className={cn(
                              "border-b border-slate-100 px-0.5 py-1 text-center",
                              cfg.bg
                            )}
                            title={`${empName} — Ngày ${d}: ${record.status}${
                              record.checkIn ? ` (${record.checkIn})` : ""
                            }${
                              record.lateMinutes > 0
                                ? ` — Trễ ${record.lateMinutes} phút`
                                : ""
                            }`}
                          >
                            {record.status === "present" && (
                              <span className={cn("text-[10px] font-medium", cfg.text)}>
                                {record.checkIn ?? "✓"}
                              </span>
                            )}
                            {record.status === "late" && (
                              <span className={cn("flex items-center justify-center gap-px", cfg.text)}>
                                <Clock className="h-2.5 w-2.5" />
                                <span className="text-[10px]">{record.lateMinutes}&#39;</span>
                              </span>
                            )}
                            {(record.status === "absent" ||
                              record.status === "leave" ||
                              record.status === "holiday") && (
                              <span className={cn("text-[11px] font-semibold", cfg.text)}>
                                {cfg.label}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {/* Summary cells */}
                      <td className="border-b border-l border-slate-200 bg-emerald-50 px-1 py-1.5 text-center font-semibold text-emerald-700">
                        {summary.present}
                      </td>
                      <td className="border-b border-slate-200 bg-amber-50 px-1 py-1.5 text-center font-semibold text-amber-700">
                        {summary.late}
                      </td>
                      <td className="border-b border-slate-200 bg-red-50 px-1 py-1.5 text-center font-semibold text-red-600">
                        {summary.absent}
                      </td>
                      <td className="border-b border-slate-200 bg-blue-50 px-1 py-1.5 text-center font-semibold text-blue-700">
                        {summary.leave}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-100" /> Có mặt</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100" /> Đi muộn</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-100" /> Vắng (V)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-100" /> Nghỉ phép (P)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-200" /> Ngày lễ (L)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-50 border border-slate-200" /> Cuối tuần</span>
      </div>
    </div>
  );
}
