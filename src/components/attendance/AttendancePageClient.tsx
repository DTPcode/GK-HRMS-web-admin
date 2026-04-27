"use client";

// ============================================================================
// GK-HRMS — AttendancePageClient (Orchestrator)
// 3 tabs chính: Bảng Chấm Công Tháng | Đơn Nghỉ Phép | Bổ Sung Công
// Wires store → pure UI components
// ============================================================================

import { useEffect, useMemo, useState, useCallback } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { MonthlyAttendanceGrid } from "@/components/attendance/MonthlyAttendanceGrid";
import { LeaveRequestTable } from "@/components/attendance/LeaveRequestTable";
import { SupplementTable } from "@/components/attendance/SupplementTable";
import { SupplementRequestForm } from "@/components/attendance/SupplementRequestForm";
import { ShiftSchedulePanel } from "@/components/attendance/ShiftSchedulePanel";
import { MonthlySummaryPanel } from "@/components/attendance/MonthlySummaryPanel";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { LockBadge } from "@/components/shared/LockBadge";
import { useAttendanceStore } from "@/store/attendanceStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { useAccountStore } from "@/store/accountStore";
import { useSupplementStore } from "@/store/supplementStore";
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

  // Supplement store
  const supplements = useSupplementStore((s) => s.supplements);
  const supplementLoading = useSupplementStore((s) => s.loading);
  const fetchSupplements = useSupplementStore((s) => s.fetchSupplements);
  const createSupplement = useSupplementStore((s) => s.createSupplement);
  const approveSupplement = useSupplementStore((s) => s.approveSupplement);
  const rejectSupplement = useSupplementStore((s) => s.rejectSupplement);
  const bulkApproveSupplements = useSupplementStore((s) => s.bulkApproveSupplements);
  const pendingSupplements = useSupplementStore((s) => s.pendingSupplements);
  const isLocked = useSupplementStore((s) => s.isLocked);
  const fetchDataLocks = useSupplementStore((s) => s.fetchDataLocks);

  const currentUser = useAccountStore((s) => s.currentUser);

  // ── Permissions ──
  const canApprove = usePermission("attendance", "approve");

  // ── Local state ──
  const [supplementFormOpen, setSupplementFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // ── Fetch on mount ──
  useEffect(() => {
    fetchAttendance();
    fetchLeaveRequests();
    fetchSupplements();
    fetchDataLocks();
    if (employees.length === 0) fetchEmployees();
  }, [fetchAttendance, fetchLeaveRequests, fetchEmployees, employees.length, fetchSupplements, fetchDataLocks]);

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

  // ── Supplement actions ──
  const handleSupplementApprove = useCallback(
    async (id: string) => {
      // Check data lock
      const supp = supplements.find((s) => s.id === id);
      if (supp) {
        const month = supp.date.slice(0, 7);
        if (isLocked("attendance_period", month)) {
          toast.error(`Kỳ chấm công ${month} đã bị khóa. Không thể duyệt.`);
          return;
        }
      }
      try {
        await approveSupplement(id);
        toast.success("Đã duyệt yêu cầu bổ sung công");
      } catch {
        toast.error("Không thể duyệt yêu cầu. Vui lòng thử lại.");
      }
    },
    [approveSupplement, supplements, isLocked]
  );

  const handleSupplementReject = useCallback(
    async (id: string, reason: string) => {
      try {
        await rejectSupplement(id, reason);
        toast.success("Đã từ chối yêu cầu bổ sung công");
      } catch {
        toast.error("Không thể từ chối yêu cầu. Vui lòng thử lại.");
      }
    },
    [rejectSupplement]
  );

  const handleSupplementBulkApprove = useCallback(
    async (ids: string[]) => {
      // Check data lock cho tất cả
      for (const id of ids) {
        const supp = supplements.find((s) => s.id === id);
        if (supp) {
          const month = supp.date.slice(0, 7);
          if (isLocked("attendance_period", month)) {
            toast.error(`Kỳ chấm công ${month} đã bị khóa. Không thể duyệt.`);
            return;
          }
        }
      }
      try {
        await bulkApproveSupplements(ids);
        toast.success(`Đã duyệt ${ids.length} yêu cầu bổ sung công`);
      } catch {
        toast.error("Có lỗi khi duyệt bổ sung công. Vui lòng thử lại.");
      }
    },
    [bulkApproveSupplements, supplements, isLocked]
  );

  const handleSupplementFormSubmit = useCallback(
    async (data: {
      employeeId: string;
      type: "late_explanation" | "early_leave" | "missing_checkin" | "missing_checkout" | "overtime_request";
      date: string;
      requestedCheckIn: string | null;
      requestedCheckOut: string | null;
      reason: string;
    }) => {
      setFormLoading(true);
      try {
        await createSupplement(data);
        toast.success("Đã gửi yêu cầu bổ sung công");
        setSupplementFormOpen(false);
      } catch {
        toast.error("Không thể gửi yêu cầu. Vui lòng thử lại.");
      } finally {
        setFormLoading(false);
      }
    },
    [createSupplement]
  );

  const pendingCount = getPendingLeaveCount();
  const pendingSupplementCount = pendingSupplements().length;

  return (
    <div>
      <BreadCrumb items={[{ label: "Chấm công" }]} />

      <PageHeader
        title="Quản lý chấm công"
        description={`${records.length} bản ghi · ${pendingCount} đơn nghỉ chờ duyệt · ${pendingSupplementCount} bổ sung chờ duyệt`}
        actions={
          <LockBadge type="attendance_period" period={selectedMonth} />
        }
      />

      {/* ── Content ── */}
      {(loading || supplementLoading) && <TableSkeleton rows={8} columns={6} />}

      {!loading && !supplementLoading && error && (
        <ErrorMessage
          message={error}
          onRetry={() => {
            fetchAttendance();
            fetchLeaveRequests();
            fetchSupplements();
          }}
        />
      )}

      {!loading && !supplementLoading && !error && (
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
            <TabsTrigger value="supplements" className="gap-1.5">
              📑 Bổ Sung Công
              {pendingSupplementCount > 0 && (
                <span className="rounded-full bg-sky-100 px-1.5 text-xs text-sky-700">
                  {pendingSupplementCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="shifts" className="gap-1.5">
              📅 Phân Ca
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5">
              📊 Tổng Hợp
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

          {/* Tab 3: Bổ Sung Công */}
          <TabsContent value="supplements" className="mt-4 space-y-4">
            {/* Add button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setSupplementFormOpen(true)}
                className="gap-1.5"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Tạo yêu cầu bổ sung
              </Button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <SupplementTable
                supplements={supplements}
                employeeMap={employeeMap}
                onApprove={handleSupplementApprove}
                onReject={handleSupplementReject}
                onBulkApprove={handleSupplementBulkApprove}
                canApprove={canApprove}
              />
            </div>
          </TabsContent>

          {/* Tab 4: Phân Ca */}
          <TabsContent value="shifts" className="mt-4">
            <ShiftSchedulePanel />
          </TabsContent>

          {/* Tab 5: Tổng Hợp */}
          <TabsContent value="summary" className="mt-4">
            <MonthlySummaryPanel />
          </TabsContent>
        </Tabs>
      )}

      {/* ── Supplement Form Dialog ── */}
      <Dialog open={supplementFormOpen} onOpenChange={setSupplementFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Tạo yêu cầu bổ sung công</DialogTitle>
          </DialogHeader>
          <SupplementRequestForm
            employeeId={currentUser.employeeId ?? currentUser.id}
            onSubmit={handleSupplementFormSubmit}
            isLoading={formLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
