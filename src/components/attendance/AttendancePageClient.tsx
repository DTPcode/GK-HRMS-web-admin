"use client";

// ============================================================================
// GK-HRMS — AttendancePageClient (Orchestrator)
// 2 tabs chính: Bảng Chấm Công Tháng | Đơn Nghỉ Phép
// Wires store → pure UI components
// ============================================================================

import { useEffect, useMemo } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { MonthlyAttendanceGrid } from "@/components/attendance/MonthlyAttendanceGrid";
import { LeaveRequestTable } from "@/components/attendance/LeaveRequestTable";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { useAttendanceStore } from "@/store/attendanceStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { usePermission } from "@/hooks/usePermission";

export function AttendancePageClient() {
  // ── Store (individual selectors → chỉ re-render khi slice thay đổi) ──
  const records = useAttendanceStore((s) => s.records);
  const leaveRequests = useAttendanceStore((s) => s.leaveRequests);
  const loading = useAttendanceStore((s) => s.loading);
  const error = useAttendanceStore((s) => s.error);
  const selectedMonth = useAttendanceStore((s) => s.selectedMonth);
  const fetchAttendance = useAttendanceStore((s) => s.fetchAttendance);
  const fetchLeaveRequests = useAttendanceStore((s) => s.fetchLeaveRequests);
  const setSelectedMonth = useAttendanceStore((s) => s.setSelectedMonth);
  const approveLeave = useAttendanceStore((s) => s.approveLeave);
  const rejectLeave = useAttendanceStore((s) => s.rejectLeave);
  const bulkApprove = useAttendanceStore((s) => s.bulkApprove);
  const getPendingLeaveCount = useAttendanceStore((s) => s.getPendingLeaveCount);
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);

  // ── Permissions ──
  const canApprove = usePermission("attendance", "approve");

  // ── Fetch on mount ──
  useEffect(() => {
    fetchAttendance();
    fetchLeaveRequests();
    if (employees.length === 0) fetchEmployees();
  }, [fetchAttendance, fetchLeaveRequests, fetchEmployees, employees.length]);

  // ── Employee map ──
  const employeeMap = useMemo(() => {
    return new Map(employees.map((e) => [e.id, e.name]));
  }, [employees]);

  // ── Month navigation ──
  const handlePrevMonth = () => {
    const prev = format(
      subMonths(new Date(`${selectedMonth}-01`), 1),
      "yyyy-MM"
    );
    setSelectedMonth(prev);
  };

  const handleNextMonth = () => {
    const next = format(
      addMonths(new Date(`${selectedMonth}-01`), 1),
      "yyyy-MM"
    );
    setSelectedMonth(next);
  };

  // ── Leave actions (wrapping store with toast) ──
  const handleApprove = async (leaveId: string) => {
    try {
      await approveLeave(leaveId);
      toast.success("Đã duyệt đơn nghỉ phép");
    } catch {
      toast.error("Không thể duyệt đơn nghỉ phép. Vui lòng thử lại.");
    }
  };

  const handleReject = async (leaveId: string, reason: string) => {
    try {
      await rejectLeave(leaveId, reason);
      toast.success("Đã từ chối đơn nghỉ phép");
    } catch {
      toast.error("Không thể từ chối đơn nghỉ phép. Vui lòng thử lại.");
    }
  };

  const handleBulkApprove = async (leaveIds: string[]) => {
    try {
      await bulkApprove(leaveIds);
      toast.success(`Đã duyệt ${leaveIds.length} đơn nghỉ phép`);
    } catch {
      toast.error("Có lỗi khi duyệt đơn nghỉ phép. Vui lòng thử lại.");
    }
  };

  const pendingCount = getPendingLeaveCount();

  return (
    <div>
      <BreadCrumb items={[{ label: "Chấm công" }]} />

      <PageHeader
        title="Quản lý chấm công"
        description={`${records.length} bản ghi · ${pendingCount} đơn nghỉ chờ duyệt`}
      />

      {/* ── Content ── */}
      {loading && <TableSkeleton rows={8} columns={6} />}

      {!loading && error && (
        <ErrorMessage
          message={error}
          onRetry={() => {
            fetchAttendance();
            fetchLeaveRequests();
          }}
        />
      )}

      {!loading && !error && (
        <Tabs defaultValue="attendance">
          <TabsList>
            <TabsTrigger value="attendance" className="gap-1.5">
              📋 Bảng Chấm Công
            </TabsTrigger>
            <TabsTrigger value="leaves" className="gap-1.5">
              📝 Đơn Nghỉ Phép
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Monthly Grid */}
          <TabsContent value="attendance" className="mt-4">
            <MonthlyAttendanceGrid
              records={records}
              selectedMonth={selectedMonth}
              employeeMap={employeeMap}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          </TabsContent>

          {/* Tab 2: Leave Requests */}
          <TabsContent value="leaves" className="mt-4">
            <LeaveRequestTable
              leaves={leaveRequests}
              employeeMap={employeeMap}
              onApprove={handleApprove}
              onReject={handleReject}
              onBulkApprove={handleBulkApprove}
              canApprove={canApprove}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
