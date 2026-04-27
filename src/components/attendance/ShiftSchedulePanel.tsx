"use client";

// ============================================================================
// GK-HRMS — ShiftSchedulePanel
// Calendar grid phân ca tuần — hiện trong Tab "Phân ca" của AttendancePage
// RBAC: View: tất cả | Assign/Edit/Delete: branch_manager, hr_admin, super_admin
// ============================================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  CalendarDays,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useAttendanceStore } from "@/store/attendanceStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { usePermission } from "@/hooks/usePermission";
import type { ShiftAssignmentType, ShiftAssignment } from "@/types/attendance";
import { SHIFT_ASSIGNMENT_CONFIG } from "@/types/attendance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lấy thứ Hai của tuần chứa ngày cho trước */
function getMonday(dateStr: string): Date {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShiftSchedulePanel() {
  const canAssign = usePermission("attendance", "create");
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const shiftAssignments = useAttendanceStore((s) => s.shiftAssignments);
  const fetchShiftAssignments = useAttendanceStore((s) => s.fetchShiftAssignments);
  const assignShift = useAttendanceStore((s) => s.assignShift);
  const bulkAssignShifts = useAttendanceStore((s) => s.bulkAssignShifts);
  const deleteShiftAssignment = useAttendanceStore((s) => s.deleteShiftAssignment);
  const weeklySchedule = useAttendanceStore((s) => s.weeklySchedule);

  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(toISODate(new Date())));
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignEmployee, setAssignEmployee] = useState<{ id: string; name: string } | null>(null);
  const [assignDate, setAssignDate] = useState("");
  const [assignShiftType, setAssignShiftType] = useState<ShiftAssignmentType>("morning");
  const [assignNote, setAssignNote] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);

  // Active employees only
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === "active" || e.status === "on_leave"),
    [employees]
  );

  // Week dates
  const weekDates = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      dates.push(toISODate(d));
    }
    return dates;
  }, [weekStart]);

  // Month string for fetching
  const monthStr = useMemo(() => toISODate(weekStart).slice(0, 7), [weekStart]);

  // Schedule data
  const schedule = weeklySchedule(toISODate(weekStart));

  // Week range label
  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return `${formatDateFull(toISODate(weekStart))} - ${formatDateFull(toISODate(end))}`;
  }, [weekStart]);

  // ── Fetch ──
  useEffect(() => {
    if (employees.length === 0) fetchEmployees();
  }, [employees.length, fetchEmployees]);

  useEffect(() => {
    setLoading(true);
    fetchShiftAssignments(monthStr).finally(() => setLoading(false));
  }, [monthStr, fetchShiftAssignments]);

  // ── Navigation ──
  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => {
    setWeekStart(getMonday(toISODate(new Date())));
  }, []);

  // ── Cell click ──
  const handleCellClick = (empId: string, empName: string, date: string) => {
    if (!canAssign) return;
    // Don't assign to on_leave/resigned
    const emp = employees.find((e) => e.id === empId);
    if (emp && (emp.status === "on_leave" || emp.status === "resigned")) {
      toast.error("Không thể phân ca cho nhân viên đang nghỉ phép hoặc đã nghỉ việc");
      return;
    }
    setAssignEmployee({ id: empId, name: empName });
    setAssignDate(date);
    const existing = shiftAssignments.find(
      (sa) => sa.employeeId === empId && sa.date === date
    );
    setAssignShiftType(existing?.shiftType ?? "morning");
    setAssignNote(existing?.note ?? "");
    setShowAssignDialog(true);
  };

  // ── Assign ──
  const handleAssign = async () => {
    if (!assignEmployee) return;
    setAssignLoading(true);
    try {
      await assignShift({
        employeeId: assignEmployee.id,
        date: assignDate,
        shiftType: assignShiftType,
        note: assignNote || undefined,
      });
      toast.success("Đã phân ca thành công");
      setShowAssignDialog(false);
    } catch {
      toast.error("Không thể phân ca. Vui lòng thử lại.");
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Delete shift ──
  const handleDeleteShift = async () => {
    if (!assignEmployee) return;
    const existing = shiftAssignments.find(
      (sa) => sa.employeeId === assignEmployee.id && sa.date === assignDate
    );
    if (!existing) return;
    try {
      await deleteShiftAssignment(existing.id);
      toast.success("Đã xóa phân ca");
      setShowAssignDialog(false);
    } catch {
      toast.error("Không thể xóa phân ca.");
    }
  };

  // ── Copy previous week ──
  const handleCopyPrevWeek = async () => {
    setShowCopyConfirm(false);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(prevWeekStart);
      d.setDate(prevWeekStart.getDate() + i);
      prevDates.push(toISODate(d));
    }

    const prevAssignments = shiftAssignments.filter((sa) =>
      prevDates.includes(sa.date)
    );
    if (prevAssignments.length === 0) {
      toast.error("Tuần trước không có phân ca nào để copy");
      return;
    }

    const newAssignments = prevAssignments.map((sa) => {
      const prevDate = new Date(sa.date);
      const dayOffset = Math.floor(
        (prevDate.getTime() - prevWeekStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const newDate = new Date(weekStart);
      newDate.setDate(weekStart.getDate() + dayOffset);
      return {
        employeeId: sa.employeeId,
        date: toISODate(newDate),
        shiftType: sa.shiftType,
        note: sa.note,
      };
    });

    try {
      await bulkAssignShifts(newAssignments);
      toast.success(`Đã copy ${newAssignments.length} phân ca từ tuần trước`);
      fetchShiftAssignments(monthStr);
    } catch {
      toast.error("Không thể copy phân ca.");
    }
  };

  // Has existing shift for delete button
  const existingShift = assignEmployee
    ? shiftAssignments.find(
        (sa) => sa.employeeId === assignEmployee.id && sa.date === assignDate
      )
    : null;

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Picker */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={goToPrevWeek} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[240px] text-center text-sm font-semibold text-slate-800">
          <CalendarDays className="mr-1.5 inline h-4 w-4 text-slate-400" />
          {weekLabel}
        </span>
        <Button variant="outline" size="sm" onClick={goToNextWeek} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs">
          Hôm nay
        </Button>
        {canAssign && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCopyConfirm(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy tuần trước
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-600 min-w-[160px]">
                Nhân viên
              </th>
              {weekDates.map((date, i) => {
                const isToday = date === toISODate(new Date());
                return (
                  <th
                    key={date}
                    className={`min-w-[72px] border-b border-slate-200 px-2 py-2 text-center font-medium ${
                      isToday ? "bg-blue-50 text-blue-700" : "text-slate-600"
                    } ${i === 5 || i === 6 ? "bg-slate-100/50" : ""}`}
                  >
                    <div className="text-xs">{DAY_LABELS[i]}</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      {formatDateShort(date)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/50">
                <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-2 font-medium text-slate-700">
                  <span className="truncate block max-w-[150px]" title={emp.name}>
                    {emp.name}
                  </span>
                  <span className="text-[10px] text-slate-400">{emp.department}</span>
                </td>
                {weekDates.map((date, i) => {
                  const sa: ShiftAssignment | undefined = schedule[emp.id]?.[date];
                  const config = sa ? SHIFT_ASSIGNMENT_CONFIG[sa.shiftType] : null;
                  const isToday = date === toISODate(new Date());
                  const isWeekend = i === 5 || i === 6;
                  return (
                    <td
                      key={date}
                      onClick={() => handleCellClick(emp.id, emp.name, date)}
                      className={`border-b border-slate-200 px-1 py-1.5 text-center ${
                        canAssign ? "cursor-pointer hover:bg-blue-50/50" : ""
                      } ${isToday ? "bg-blue-50/30" : ""} ${isWeekend ? "bg-slate-50/50" : ""}`}
                      title={
                        config
                          ? `${config.label_vi}${config.time ? ` (${config.time})` : ""}`
                          : "Chưa phân ca"
                      }
                    >
                      {config ? (
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${config.bgColor} ${config.color}`}
                        >
                          {config.shortLabel}
                        </span>
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs text-slate-300">
                          ·
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {activeEmployees.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  Không có nhân viên nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {(Object.entries(SHIFT_ASSIGNMENT_CONFIG) as [ShiftAssignmentType, typeof SHIFT_ASSIGNMENT_CONFIG[ShiftAssignmentType]][]).map(
          ([key, cfg]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`inline-block h-3.5 w-3.5 rounded-sm ${cfg.bgColor}`} />
              {cfg.label_vi}
              {cfg.time ? ` (${cfg.time})` : ""}
            </span>
          )
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-3.5 rounded-sm border border-dashed border-slate-300" />
          Chưa phân
        </span>
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              Phân ca — {assignEmployee?.name}
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Ngày {formatDateFull(assignDate)}
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Shift type radio */}
            <div className="space-y-2">
              {(Object.entries(SHIFT_ASSIGNMENT_CONFIG) as [ShiftAssignmentType, typeof SHIFT_ASSIGNMENT_CONFIG[ShiftAssignmentType]][]).map(
                ([key, cfg]) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      assignShiftType === key
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shiftType"
                      value={key}
                      checked={assignShiftType === key}
                      onChange={() => setAssignShiftType(key as ShiftAssignmentType)}
                      className="accent-blue-600"
                    />
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${cfg.bgColor} ${cfg.color}`}>
                      {cfg.shortLabel}
                    </span>
                    <div>
                      <span className="text-sm font-medium text-slate-700">
                        {cfg.label_vi}
                      </span>
                      {cfg.time && (
                        <span className="ml-2 text-xs text-slate-400">
                          {cfg.time}
                        </span>
                      )}
                    </div>
                  </label>
                )
              )}
            </div>

            {/* Note */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Ghi chú
              </label>
              <Input
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                placeholder="Ghi chú (tùy chọn)"
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            <div>
              {existingShift && canAssign && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteShift}
                  className="gap-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa ca
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssignDialog(false)}
                disabled={assignLoading}
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={assignLoading}
                className="gap-1.5"
              >
                {assignLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Lưu
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Confirm */}
      <ConfirmDialog
        open={showCopyConfirm}
        onOpenChange={setShowCopyConfirm}
        title="Copy lịch tuần trước"
        description={`Sao chép phân ca từ tuần trước sang tuần hiện tại (${weekLabel}). Các phân ca đã có sẽ bị ghi đè.`}
        confirmText="Copy"
        variant="default"
        onConfirm={handleCopyPrevWeek}
      />
    </div>
  );
}
