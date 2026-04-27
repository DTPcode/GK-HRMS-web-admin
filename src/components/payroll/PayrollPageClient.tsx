"use client";

// ============================================================================
// GK-HRMS — PayrollPageClient (Orchestrator)
// Bảng lương: month picker + stepper + summary cards + table + modals
// Workflow: draft → pending_approval → approved → paid
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  FileEdit,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { PayrollTable } from "@/components/payroll/PayrollTable";
import { SalaryBreakdownModal } from "@/components/payroll/SalaryBreakdownModal";
import { DataExportButton } from "@/components/shared/DataExportButton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { LockBadge } from "@/components/shared/LockBadge";
import { usePayrollStore } from "@/store/payrollStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { useContractStore } from "@/store/contractStore";
import { useAttendanceStore } from "@/store/attendanceStore";
import { usePermission } from "@/hooks/usePermission";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { PAYROLL_STATUS_CONFIG } from "@/types/payroll";
import type { PayrollRecord } from "@/types/payroll";

// ---------------------------------------------------------------------------
// Stepper Component (inline)
// ---------------------------------------------------------------------------

const STEPS = [
  { key: "all", label: "Tất cả", icon: Users },
  { key: "draft", label: "Nháp", icon: FileEdit },
  { key: "pending_approval", label: "Chờ duyệt", icon: Clock },
  { key: "approved", label: "Đã duyệt", icon: CheckCircle2 },
  { key: "paid", label: "Đã chi", icon: Banknote },
] as const;

type StepperFilter = "all" | "draft" | "pending_approval" | "approved" | "paid";

interface PayrollStepperProps {
  /** Bộ lọc đang chọn */
  activeFilter: StepperFilter;
  /** Số lượng record theo từng status */
  counts: Record<string, number>;
  /** Callback khi click chọn filter */
  onFilterChange: (filter: StepperFilter) => void;
}

function PayrollStepper({ activeFilter, counts, onFilterChange }: PayrollStepperProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
      {STEPS.map((step) => {
        const Icon = step.icon;
        const count = step.key === "all"
          ? Object.values(counts).reduce((s, v) => s + v, 0)
          : (counts[step.key] ?? 0);
        const isActive = activeFilter === step.key;

        return (
          <button
            key={step.key}
            onClick={() => onFilterChange(step.key)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              isActive
                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
            {step.label}
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                isActive
                  ? "bg-blue-600 text-white"
                  : count > 0
                    ? "bg-slate-200 text-slate-700"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// sumRecord helper
// ---------------------------------------------------------------------------

function sumRecord(rec: Record<string, number>): number {
  return Object.values(rec).reduce((s, v) => s + v, 0);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PayrollPageClient() {
  // ── Store (individual selectors → chỉ re-render khi slice thay đổi) ──
  const records = usePayrollStore((s) => s.records);
  const loading = usePayrollStore((s) => s.loading);
  const error = usePayrollStore((s) => s.error);
  const selectedMonth = usePayrollStore((s) => s.selectedMonth);
  const fetchPayroll = usePayrollStore((s) => s.fetchPayroll);
  const generatePayroll = usePayrollStore((s) => s.generatePayroll);
  const markAsPaid = usePayrollStore((s) => s.markAsPaid);
  const submitForApproval = usePayrollStore((s) => s.submitForApproval);
  const approvePayroll = usePayrollStore((s) => s.approvePayroll);
  const rejectPayroll = usePayrollStore((s) => s.rejectPayroll);
  const advanceMonthStatus = usePayrollStore((s) => s.advanceMonthStatus);

  const setSelectedMonth = usePayrollStore((s) => s.setSelectedMonth);
  const payrollSummary = usePayrollStore((s) => s.payrollSummary);
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const fetchContracts = useContractStore((s) => s.fetchContracts);
  const fetchAttendance = useAttendanceStore((s) => s.fetchAttendance);

  // ── Local state ──
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [breakdownRecord, setBreakdownRecord] = useState<PayrollRecord | null>(
    null
  );
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StepperFilter>("all");

  // ── Permissions ──
  const canApprove = usePermission("payroll", "approve");

  // ── Fetch on mount: đảm bảo employees load trước khi tạo bảng lương ──
  useEffect(() => {
    // Dùng getState() để tránh deps thay đổi size giữa renders
    const empState = useEmployeeStore.getState();
    if (empState.employees.length === 0) {
      empState.fetchEmployees();
    }
    usePayrollStore.getState().fetchPayroll();
    useContractStore.getState().fetchContracts();
    useAttendanceStore.getState().fetchAttendance();
  }, []);

  // ── Maps ──
  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees]
  );
  const departmentMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.department])),
    [employees]
  );

  // ── Month records ──
  const monthRecords = useMemo(
    () => records.filter((r) => r.month === selectedMonth),
    [records, selectedMonth]
  );

  const hasPayrollForMonth = monthRecords.length > 0;
  /** Đã duyệt/chi → không cho tính lại */
  const isLocked = monthRecords.some(
    (r) => r.status === "approved" || r.status === "paid"
  );

  // ── Summary (L2: memoized) ──
  const summary = useMemo(() => payrollSummary(), [records, selectedMonth]);

  // ── Current workflow step (highest status in month) ──
  const currentStep = useMemo(() => {
    if (monthRecords.length === 0) return 0;
    const maxStep = Math.max(
      ...monthRecords.map((r) => PAYROLL_STATUS_CONFIG[r.status].step)
    );
    return maxStep;
  }, [monthRecords]);

  // ── Status counts (for stepper badges) ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      draft: 0,
      pending_approval: 0,
      approved: 0,
      paid: 0,
    };
    for (const r of monthRecords) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    return counts;
  }, [monthRecords]);

  // ── Filtered records by stepper tab ──
  const filteredRecords = useMemo(() => {
    if (statusFilter === "all") return monthRecords;
    return monthRecords.filter((r) => r.status === statusFilter);
  }, [monthRecords, statusFilter]);

  // ── Month navigation ──
  const handlePrevMonth = () => {
    setSelectedMonth(
      format(subMonths(new Date(`${selectedMonth}-01`), 1), "yyyy-MM")
    );
  };
  const handleNextMonth = () => {
    setSelectedMonth(
      format(addMonths(new Date(`${selectedMonth}-01`), 1), "yyyy-MM")
    );
  };

  // ── Handlers ──
  const handleGenerate = async () => {
    await generatePayroll(selectedMonth);
    toast.success(`Đã tạo bảng lương tháng ${formatMonth(selectedMonth + "-01")}`);
    setShowGenerateDialog(false);
  };

  const handleMarkAsPaid = async () => {
    if (!markPaidId) return;
    await markAsPaid(markPaidId);
    toast.success("Đã đánh dấu chi lương");
    setMarkPaidId(null);
  };

  // ── Workflow advance ──
  const WORKFLOW_ACTIONS: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
    draft: {
      label: "Gửi duyệt",
      icon: <Send className="h-4 w-4" />,
      description: `Gửi bảng lương tháng ${formatMonth(selectedMonth + "-01")} để quản lý duyệt?`,
    },
    pending_approval: {
      label: "Duyệt bảng lương",
      icon: <ShieldCheck className="h-4 w-4" />,
      description: `Duyệt bảng lương tháng ${formatMonth(selectedMonth + "-01")} cho ${monthRecords.length} nhân viên?`,
    },
    approved: {
      label: "Xác nhận chi lương",
      icon: <Banknote className="h-4 w-4" />,
      description: `Xác nhận đã chi lương tháng ${formatMonth(selectedMonth + "-01")} cho ${monthRecords.length} nhân viên? Hành động này không thể hoàn tác.`,
    },
  };

  const currentMonthStatus = monthRecords.length > 0 ? monthRecords[0].status : null;
  const workflowAction = currentMonthStatus ? WORKFLOW_ACTIONS[currentMonthStatus] : null;

  const handleAdvanceStatus = async () => {
    await advanceMonthStatus(selectedMonth);
    const label = workflowAction?.label ?? "Cập nhật";
    toast.success(`${label} thành công`);
    setShowAdvanceDialog(false);
  };

  const breakdownEmpName = breakdownRecord
    ? employeeMap.get(breakdownRecord.employeeId) ?? breakdownRecord.employeeId
    : "";

  // ── Export data ──
  const exportData = useMemo(() => {
    return monthRecords.map((r) => ({
      "Mã NV": r.employeeId,
      "Tên NV": employeeMap.get(r.employeeId) ?? r.employeeId,
      "Phòng ban": departmentMap.get(r.employeeId) ?? "",
      "Kỳ lương": r.month,
      "Ngày công": `${r.actualWorkDays}/${r.totalWorkDays}`,
      "Lương cơ bản": r.baseSalary,
      "Phụ cấp": sumRecord(r.allowances),
      Thưởng: r.bonus,
      Phạt: r.penalty,
      "Giờ OT": r.overtimeHours,
      "Lương OT": r.overtimePay,
      "Tổng thu nhập": r.grossSalary,
      "Khấu trừ": sumRecord(r.deductions),
      "Thực lĩnh": r.netSalary,
      "Trạng thái": PAYROLL_STATUS_CONFIG[r.status].label_vi,
    }));
  }, [monthRecords, employeeMap, departmentMap]);

  return (
    <div>
      <BreadCrumb items={[{ label: "Tính lương" }]} />

      <PageHeader
        title="Quản lý bảng lương"
        description={`Kỳ lương ${formatMonth(selectedMonth + "-01")} · ${monthRecords.length} nhân viên`}
        actions={
          <div className="flex items-center gap-2">
            <DataExportButton
              label="Xuất CSV"
              data={exportData}
              filename={`bang-luong-${selectedMonth}`}
              disabled={monthRecords.length === 0}
            />
            <Button
              onClick={() => setShowGenerateDialog(true)}
              disabled={loading || isLocked}
              className="gap-1.5"
            >
              {hasPayrollForMonth ? (
                <><RefreshCcw className="h-4 w-4" /> Tính lại</>
              ) : (
                <><Plus className="h-4 w-4" /> Tạo bảng lương</>
              )}
            </Button>
          </div>
        }
      />

      {/* ── Month Picker ── */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0" aria-label="Tháng trước">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[140px] text-center text-sm font-semibold text-slate-800">
          Tháng {formatMonth(selectedMonth + "-01")}
        </span>
        <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0" aria-label="Tháng sau">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <LockBadge type="payroll_period" period={selectedMonth} />
      </div>

      {/* ── Workflow Stepper (filter buttons) + Bulk Action ── */}
      {monthRecords.length > 0 && (
        <div className="mb-6">
          <PayrollStepper
            activeFilter={statusFilter}
            counts={statusCounts}
            onFilterChange={setStatusFilter}
          />
          {workflowAction && currentMonthStatus !== "paid" && (
            <div className="flex justify-center mt-2">
              <Button
                onClick={() => setShowAdvanceDialog(true)}
                disabled={loading}
                className="gap-1.5"
                variant={currentMonthStatus === "approved" ? "default" : "outline"}
              >
                {workflowAction.icon}
                {workflowAction.label} tất cả
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<Users className="h-5 w-5 text-blue-600" />}
            label="Tổng nhân viên"
            value={String(summary.totalEmployees)}
            bgColor="bg-blue-50"
          />
          <SummaryCard
            icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
            label="Tổng lương Gross"
            value={formatCurrency(summary.totalGross)}
            bgColor="bg-emerald-50"
          />
          <SummaryCard
            icon={<TrendingUp className="h-5 w-5 text-violet-600" />}
            label="Tổng lương Net"
            value={formatCurrency(summary.totalNet)}
            bgColor="bg-violet-50"
          />
          <SummaryCard
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            label="Tổng tiền OT"
            value={formatCurrency(summary.totalOvertime)}
            bgColor="bg-amber-50"
          />
        </div>
      )}

      {/* ── Content ── */}
      {loading && <TableSkeleton rows={8} columns={11} />}

      {!loading && error && (
        <ErrorMessage message={error} onRetry={fetchPayroll} />
      )}

      {!loading && !error && (
        <PayrollTable
          records={filteredRecords}
          employeeMap={employeeMap}
          departmentMap={departmentMap}
          onViewBreakdown={(r) => setBreakdownRecord(r)}
          onMarkAsPaid={(id) => setMarkPaidId(id)}
          onSubmitForApproval={submitForApproval}
          onApprove={approvePayroll}
          onReject={rejectPayroll}
          canApprove={canApprove}
        />
      )}

      {/* ── SalaryBreakdownModal ── */}
      <SalaryBreakdownModal
        open={!!breakdownRecord}
        onOpenChange={(open) => {
          if (!open) setBreakdownRecord(null);
        }}
        record={breakdownRecord}
        employeeName={breakdownEmpName}
      />

      {/* ── Generate Dialog ── */}
      <ConfirmDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        title={hasPayrollForMonth ? "Tính lại bảng lương?" : "Tạo bảng lương?"}
        description={
          hasPayrollForMonth
            ? `Bảng lương cũ tháng ${formatMonth(selectedMonth + "-01")} sẽ bị xóa và tính lại cho tất cả nhân viên đang làm việc.`
            : `Tạo bảng lương tháng ${formatMonth(selectedMonth + "-01")} cho tất cả nhân viên đang làm việc?`
        }
        confirmText={hasPayrollForMonth ? "Tính lại" : "Tạo bảng lương"}
        variant="default"
        onConfirm={handleGenerate}
      />

      {/* ── Mark Paid Dialog ── */}
      <ConfirmDialog
        open={!!markPaidId}
        onOpenChange={(open) => {
          if (!open) setMarkPaidId(null);
        }}
        title="Xác nhận chi lương?"
        description="Đánh dấu đã chi lương cho nhân viên này. Hành động này không thể hoàn tác."
        confirmText="Đã chi lương"
        variant="default"
        onConfirm={handleMarkAsPaid}
      />

      {/* ── Advance Status Dialog ── */}
      {workflowAction && (
        <ConfirmDialog
          open={showAdvanceDialog}
          onOpenChange={setShowAdvanceDialog}
          title={`${workflowAction.label}?`}
          description={workflowAction.description}
          confirmText={workflowAction.label}
          variant="default"
          onConfirm={handleAdvanceStatus}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard (inline helper)
// ---------------------------------------------------------------------------

function SummaryCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}
