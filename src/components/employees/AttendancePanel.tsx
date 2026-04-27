"use client";

// ============================================================================
// GK-HRMS — AttendancePanel
// Tab Chấm công trong trang chi tiết nhân viên
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  CalendarCheck,
  AlertTriangle,
  CalendarMinus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAttendanceStore } from "@/store/attendanceStore";
import { formatDate } from "@/lib/utils";

interface AttendancePanelProps {
  employeeId: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  present: { label: "Đúng giờ", cls: "bg-emerald-100 text-emerald-700" },
  late:    { label: "Đi muộn", cls: "bg-amber-100 text-amber-700" },
  absent:  { label: "Vắng", cls: "bg-red-100 text-red-600" },
  leave:   { label: "Nghỉ phép", cls: "bg-slate-100 text-slate-600" },
  holiday: { label: "Ngày lễ", cls: "bg-blue-100 text-blue-700" },
};

const SHIFT_LABEL: Record<string, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  split: "Gãy",
};

export function AttendancePanel({ employeeId }: AttendancePanelProps) {
  const records = useAttendanceStore((s) => s.records);
  const loading = useAttendanceStore((s) => s.loading);
  const error = useAttendanceStore((s) => s.error);
  const fetchAttendance = useAttendanceStore((s) => s.fetchAttendance);

  const [fetched, setFetched] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchAttendance().finally(() => setFetched(true));
  }, [fetchAttendance]);

  const empRecords = useMemo(
    () =>
      records
        .filter((r) => r.employeeId === employeeId && r.date.startsWith(month))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [records, employeeId, month]
  );

  // Stats
  const stats = useMemo(() => {
    let workDays = 0, lateDays = 0, lateMinutes = 0, absentDays = 0, otHours = 0;
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    let standardDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(y, m - 1, d).getDay();
      if (dow !== 0 && dow !== 6) standardDays++;
    }
    for (const r of empRecords) {
      if (r.status === "present" || r.status === "late") workDays++;
      if (r.status === "late") { lateDays++; lateMinutes += r.lateMinutes; }
      if (r.status === "absent") absentDays++;
      otHours += r.overtimeHours;
    }
    return { workDays, standardDays, lateDays, lateMinutes, absentDays, otHours: Math.round(otHours * 10) / 10 };
  }, [empRecords, month]);

  const prevMonth = () => {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() - 1);
    setMonth(d.toISOString().slice(0, 7));
  };
  const nextMonth = () => {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() + 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const monthLabel = (() => {
    const [y, m] = month.split("-");
    return `Tháng ${parseInt(m)}/${y}`;
  })();

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
        <Button size="sm" variant="outline" onClick={() => fetchAttendance()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month picker */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
          {monthLabel}
        </span>
        <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarCheck className="h-3.5 w-3.5" /> Ngày công
          </div>
          <p className="mt-1 text-lg font-bold text-slate-800">
            {stats.workDays}/{stats.standardDays}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5" /> Đi muộn
          </div>
          <p className="mt-1 text-lg font-bold text-amber-600">
            {stats.lateDays} ngày {stats.lateMinutes > 0 ? `(${stats.lateMinutes}p)` : ""}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarMinus className="h-3.5 w-3.5" /> Vắng
          </div>
          <p className="mt-1 text-lg font-bold text-red-600">{stats.absentDays}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" /> OT
          </div>
          <p className="mt-1 text-lg font-bold text-orange-600">{stats.otHours}h</p>
        </div>
      </div>

      {/* Table */}
      {empRecords.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Chưa có dữ liệu chấm công tháng này</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-b px-3 py-2 text-left font-medium text-slate-600">Ngày</th>
                <th className="border-b px-3 py-2 text-left font-medium text-slate-600">Ca</th>
                <th className="border-b px-3 py-2 text-center font-medium text-slate-600">Giờ vào</th>
                <th className="border-b px-3 py-2 text-center font-medium text-slate-600">Giờ ra</th>
                <th className="border-b px-3 py-2 text-center font-medium text-slate-600">Trạng thái</th>
                <th className="border-b px-3 py-2 text-left font-medium text-slate-600">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {empRecords.map((r) => {
                const sb = STATUS_BADGE[r.status] ?? { label: r.status, cls: "bg-slate-100 text-slate-600" };
                return (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-700">{formatDate(r.date)}</td>
                    <td className="px-3 py-2 text-slate-600">{SHIFT_LABEL[r.shiftType] ?? r.shiftType}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{r.checkIn ?? "—"}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{r.checkOut ?? "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge className={`text-[10px] ${sb.cls}`}>{sb.label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">{r.note ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
