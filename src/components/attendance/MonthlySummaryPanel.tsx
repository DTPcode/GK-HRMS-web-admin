"use client";

// ============================================================================
// GK-HRMS — MonthlySummaryPanel
// Tổng hợp bảng công tháng — hiện trong Tab "Tổng hợp" của AttendancePage
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import {
  RefreshCw,
  CheckCircle2,
  Download,
  Users,
  CalendarCheck,
  Clock,
  CalendarMinus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useAttendanceStore } from "@/store/attendanceStore";
import { useSupplementStore } from "@/store/supplementStore";
import { usePermission } from "@/hooks/usePermission";
import type { MonthlySummaryRow, SummaryStatus } from "@/types/attendance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `Tháng ${parseInt(m)}/${y}`;
}

const STATUS_CONFIG: Record<
  SummaryStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Nháp",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  locked: {
    label: "Đã khóa",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonthlySummaryPanel() {
  const canGenerate = usePermission("attendance", "create");
  const canConfirm = usePermission("attendance", "update");
  const selectedMonth = useAttendanceStore((s) => s.selectedMonth);
  const monthlySummaries = useAttendanceStore((s) => s.monthlySummaries);
  const summaryLoading = useAttendanceStore((s) => s.summaryLoading);
  const fetchMonthlySummaries = useAttendanceStore((s) => s.fetchMonthlySummaries);
  const generateMonthlySummary = useAttendanceStore((s) => s.generateMonthlySummary);
  const confirmSummary = useAttendanceStore((s) => s.confirmSummary);
  const confirmAllSummaries = useAttendanceStore((s) => s.confirmAllSummaries);
  const summariesByMonth = useAttendanceStore((s) => s.summariesByMonth);
  const isLocked = useSupplementStore((s) => s.isLocked);

  const [loading, setLoading] = useState(true);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showConfirmAllDialog, setShowConfirmAllDialog] = useState(false);

  const locked = isLocked("attendance_period", selectedMonth);
  const rows: MonthlySummaryRow[] = summariesByMonth(selectedMonth);

  // Stats
  const stats = useMemo(() => {
    return {
      totalEmployees: rows.length,
      totalWorkDays: rows.reduce((s, r) => s + r.totalWorkDays, 0),
      totalOT: Math.round(rows.reduce((s, r) => s + r.totalOvertimeHours, 0) * 10) / 10,
      totalLeave: rows.reduce((s, r) => s + r.totalLeaveDays, 0),
    };
  }, [rows]);

  const draftCount = rows.filter((r) => r.status === "draft").length;

  // ── Fetch ──
  useEffect(() => {
    setLoading(true);
    fetchMonthlySummaries(selectedMonth).finally(() => setLoading(false));
  }, [selectedMonth, fetchMonthlySummaries]);

  // ── Generate ──
  const handleGenerate = async () => {
    setShowGenerateConfirm(false);
    try {
      await generateMonthlySummary(selectedMonth);
      toast.success(`Đã tổng hợp bảng công ${formatMonth(selectedMonth)}`);
    } catch {
      toast.error("Không thể tổng hợp bảng công.");
    }
  };

  // ── Confirm single ──
  const handleConfirm = async (employeeId: string) => {
    try {
      await confirmSummary(employeeId, selectedMonth);
      toast.success("Đã xác nhận");
    } catch {
      toast.error("Không thể xác nhận.");
    }
  };

  // ── Confirm all ──
  const handleConfirmAll = async () => {
    setShowConfirmAllDialog(false);
    try {
      await confirmAllSummaries(selectedMonth);
      toast.success("Đã xác nhận tất cả");
    } catch {
      toast.error("Không thể xác nhận.");
    }
  };

  // ── Export Excel ──
  const handleExport = () => {
    if (rows.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }
    // CSV export (simple Excel-compatible)
    const headers = [
      "Nhân viên",
      "Phòng ban",
      "Ngày công",
      "Ngày chuẩn",
      "Nghỉ phép",
      "Vắng",
      "Đi muộn (ngày)",
      "Đi muộn (phút)",
      "OT (giờ)",
      "Ngày lễ",
      "Trạng thái",
    ];
    const csvRows = rows.map((r) => [
      r.employeeName,
      r.department,
      r.totalWorkDays,
      r.standardWorkDays,
      r.totalLeaveDays,
      r.totalAbsentDays,
      r.totalLateDays,
      r.totalLateMinutes,
      r.totalOvertimeHours,
      r.totalHolidayDays,
      STATUS_CONFIG[r.status].label,
    ]);

    const BOM = "\uFEFF";
    const csv = BOM + [headers, ...csvRows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bang-cong-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file Excel");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Tổng hợp bảng công — {formatMonth(selectedMonth)}
          </span>
          <Badge
            className={`text-[10px] ${
              locked
                ? "border-red-200 bg-red-100 text-red-700"
                : "border-emerald-200 bg-emerald-100 text-emerald-700"
            }`}
          >
            {locked ? "Đã khóa" : "Đang mở"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {canGenerate && !locked && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGenerateConfirm(true)}
              disabled={summaryLoading}
              className="gap-1.5 text-xs"
            >
              {summaryLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Tổng hợp bảng công
            </Button>
          )}
          {canConfirm && draftCount > 0 && !locked && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConfirmAllDialog(true)}
              className="gap-1.5 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Xác nhận tất cả ({draftCount})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={rows.length === 0}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Users className="h-3.5 w-3.5" /> Nhân viên
            </div>
            <p className="mt-1 text-xl font-bold text-slate-800">
              {stats.totalEmployees}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CalendarCheck className="h-3.5 w-3.5" /> Tổng ngày công
            </div>
            <p className="mt-1 text-xl font-bold text-slate-800">
              {stats.totalWorkDays}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" /> Tổng giờ OT
            </div>
            <p className="mt-1 text-xl font-bold text-orange-600">
              {stats.totalOT}h
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CalendarMinus className="h-3.5 w-3.5" /> Nghỉ phép
            </div>
            <p className="mt-1 text-xl font-bold text-slate-800">
              {stats.totalLeave}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {(loading || summaryLoading) && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 mr-2" />
          <span className="text-sm text-slate-500">
            {summaryLoading ? "Đang tổng hợp bảng công..." : "Đang tải..."}
          </span>
        </div>
      )}

      {/* Table */}
      {!loading && !summaryLoading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <CalendarCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            Chưa có dữ liệu tổng hợp — nhấn{" "}
            <span className="font-medium">Tổng hợp bảng công</span> để bắt đầu
          </p>
        </div>
      )}

      {!loading && !summaryLoading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-left font-medium text-slate-600 min-w-[160px]">
                  Nhân viên
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-left font-medium text-slate-600 min-w-[90px]">
                  Phòng ban
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-center font-medium text-slate-600 min-w-[80px]">
                  Ngày công
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-center font-medium text-slate-600 min-w-[70px]">
                  Nghỉ phép
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-center font-medium text-slate-600 min-w-[60px]">
                  Vắng
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-center font-medium text-slate-600 min-w-[100px]">
                  Đi muộn
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-center font-medium text-slate-600 min-w-[70px]">
                  OT (giờ)
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-center font-medium text-slate-600 min-w-[90px]">
                  Trạng thái
                </th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-center font-medium text-slate-600 min-w-[90px]">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const cfg = STATUS_CONFIG[row.status];
                const lowAttendance =
                  row.standardWorkDays > 0 &&
                  row.totalWorkDays < row.standardWorkDays * 0.5;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50"
                  >
                    <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-2 font-medium text-slate-700">
                      {row.employeeName}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{row.department}</td>
                    <td
                      className={`px-3 py-2 text-center font-medium ${
                        lowAttendance ? "text-red-600" : "text-slate-700"
                      }`}
                    >
                      {row.totalWorkDays}/{row.standardWorkDays}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {row.totalLeaveDays || "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {row.totalAbsentDays || "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {row.totalLateDays > 0
                        ? `${row.totalLateDays} ngày (${row.totalLateMinutes} phút)`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-orange-600">
                      {row.totalOvertimeHours > 0
                        ? row.totalOvertimeHours
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge className={`text-[10px] ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.status === "draft" && canConfirm && !locked ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleConfirm(row.employeeId)}
                          className="h-7 gap-1 text-xs text-emerald-600 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Xác nhận
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {cfg.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate Confirm */}
      <ConfirmDialog
        open={showGenerateConfirm}
        onOpenChange={setShowGenerateConfirm}
        title="Tổng hợp bảng công"
        description={`Tổng hợp bảng công ${formatMonth(selectedMonth)}. Dữ liệu tổng hợp cũ sẽ bị ghi đè. Tiếp tục?`}
        confirmText="Tổng hợp"
        variant="default"
        onConfirm={handleGenerate}
      />

      {/* Confirm All */}
      <ConfirmDialog
        open={showConfirmAllDialog}
        onOpenChange={setShowConfirmAllDialog}
        title="Xác nhận tất cả"
        description={`Xác nhận tất cả ${draftCount} bảng công đang ở trạng thái nháp?`}
        confirmText="Xác nhận tất cả"
        variant="default"
        onConfirm={handleConfirmAll}
      />
    </div>
  );
}
