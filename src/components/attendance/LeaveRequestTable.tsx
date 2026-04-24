"use client";

// ============================================================================
// GK-HRMS — LeaveRequestTable
// Bảng đơn nghỉ phép: 3 sub-tabs (Chờ duyệt | Đã duyệt | Đã từ chối)
// Actions: Duyệt, Từ chối (dialog lý do), Bulk approve
// CONSTRAINT: onApprove/onReject là callbacks, không import store trực tiếp
// ============================================================================

import { useState, useMemo } from "react";
import { Check, X, CheckCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatDate } from "@/lib/utils";
import { LEAVE_TYPE_CONFIG } from "@/types/attendance";
import type { LeaveRequest } from "@/types/attendance";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LeaveRequestTableProps {
  leaves: LeaveRequest[];
  /** Map employeeId → tên NV */
  employeeMap: Map<string, string>;
  /** Callback duyệt 1 đơn */
  onApprove: (leaveId: string) => Promise<void>;
  /** Callback từ chối 1 đơn */
  onReject: (leaveId: string, reason: string) => Promise<void>;
  /** Callback duyệt hàng loạt */
  onBulkApprove: (leaveIds: string[]) => Promise<void>;
  /** Có quyền approve? */
  canApprove: boolean;
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const LEAVE_STATUS_CONFIG = {
  pending: { label: "Chờ duyệt", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Đã duyệt", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Đã từ chối", color: "bg-red-100 text-red-600" },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeaveRequestTable({
  leaves,
  employeeMap,
  onApprove,
  onReject,
  onBulkApprove,
  canApprove,
}: LeaveRequestTableProps) {
  // ── Sub-tab state ──
  const [subTab, setSubTab] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );

  // ── Selected IDs for bulk approve ──
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Reject dialog ──
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // ── Bulk approve dialog ──
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  // ── Filter by sub-tab ──
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => l.status === subTab);
  }, [leaves, subTab]);

  // ── Counts ──
  const counts = useMemo(() => {
    return {
      pending: leaves.filter((l) => l.status === "pending").length,
      approved: leaves.filter((l) => l.status === "approved").length,
      rejected: leaves.filter((l) => l.status === "rejected").length,
    };
  }, [leaves]);

  // ── Handlers ──
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pendingIds = filteredLeaves.map((l) => l.id);
    const allSelected = pendingIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : pendingIds);
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    await onReject(rejectTarget, rejectReason.trim());
    setRejectTarget(null);
    setRejectReason("");
  };

  const handleBulkApprove = async () => {
    await onBulkApprove(selectedIds);
    setSelectedIds([]);
    setShowBulkDialog(false);
  };

  // ── Render table rows ──
  const renderRows = (data: LeaveRequest[], showActions: boolean) => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={showActions ? 10 : 9} className="py-8 text-center text-sm text-slate-500">
            Không có đơn nghỉ phép nào.
          </TableCell>
        </TableRow>
      );
    }

    return data.map((leave) => {
      const empName = employeeMap.get(leave.employeeId) ?? leave.employeeId;
      const typeCfg = LEAVE_TYPE_CONFIG[leave.type];
      const statusCfg = LEAVE_STATUS_CONFIG[leave.status];

      return (
        <TableRow key={leave.id} className="group">
          {/* Checkbox (only pending tab) */}
          {showActions && (
            <TableCell className="w-10 pl-4">
              <input
                type="checkbox"
                checked={selectedIds.includes(leave.id)}
                onChange={() => toggleSelect(leave.id)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                aria-label={`Chọn đơn ${leave.id}`}
              />
            </TableCell>
          )}

          {/* Nhân viên */}
          <TableCell className="font-medium text-slate-800">
            {empName}
          </TableCell>

          {/* Loại nghỉ */}
          <TableCell>
            <Badge variant="secondary" className="text-xs">
              {typeCfg.label_vi}
            </Badge>
          </TableCell>

          {/* Từ ngày */}
          <TableCell className="text-sm text-slate-600">
            {formatDate(leave.startDate)}
          </TableCell>

          {/* Đến ngày */}
          <TableCell className="text-sm text-slate-600">
            {formatDate(leave.endDate)}
          </TableCell>

          {/* Số ngày */}
          <TableCell className="text-center text-sm font-medium text-slate-700">
            {leave.totalDays}
          </TableCell>

          {/* Lý do */}
          <TableCell className="max-w-[180px]">
            <p className="truncate text-sm text-slate-600" title={leave.reason}>
              {leave.reason}
            </p>
          </TableCell>

          {/* Trạng thái */}
          <TableCell>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}
            >
              {statusCfg.label}
            </span>
          </TableCell>

          {/* Actions — chỉ cho pending */}
          {showActions && (
            <TableCell className="text-right">
              {canApprove && (
                <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onApprove(leave.id)}
                    className="h-8 gap-1 px-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Duyệt
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRejectTarget(leave.id)}
                    className="h-8 gap-1 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="h-3.5 w-3.5" />
                    Từ chối
                  </Button>
                </div>
              )}
            </TableCell>
          )}
        </TableRow>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <Tabs
        value={subTab}
        onValueChange={(v) => {
          setSubTab(v as typeof subTab);
          setSelectedIds([]);
        }}
      >
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            Chờ duyệt
            {counts.pending > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">
                {counts.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5">
            Đã duyệt
            <span className="rounded-full bg-emerald-100 px-1.5 text-xs text-emerald-700">
              {counts.approved}
            </span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5">
            Đã từ chối
            {counts.rejected > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 text-xs text-red-600">
                {counts.rejected}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending tab */}
        <TabsContent value="pending">
          {/* Bulk approve bar */}
          {selectedIds.length > 0 && canApprove && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
              <span className="text-sm text-blue-700">
                Đã chọn {selectedIds.length} đơn
              </span>
              <Button
                size="sm"
                onClick={() => setShowBulkDialog(true)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Duyệt tất cả đã chọn
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-4">
                      <input
                        type="checkbox"
                        checked={
                          filteredLeaves.length > 0 &&
                          filteredLeaves.every((l) =>
                            selectedIds.includes(l.id)
                          )
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label="Chọn tất cả"
                      />
                    </TableHead>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Loại nghỉ</TableHead>
                    <TableHead>Từ ngày</TableHead>
                    <TableHead>Đến ngày</TableHead>
                    <TableHead className="text-center">Số ngày</TableHead>
                    <TableHead>Lý do</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-40 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderRows(filteredLeaves, true)}</TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Approved tab */}
        <TabsContent value="approved">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Loại nghỉ</TableHead>
                    <TableHead>Từ ngày</TableHead>
                    <TableHead>Đến ngày</TableHead>
                    <TableHead className="text-center">Số ngày</TableHead>
                    <TableHead>Lý do</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderRows(filteredLeaves, false)}</TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Rejected tab */}
        <TabsContent value="rejected">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Loại nghỉ</TableHead>
                    <TableHead>Từ ngày</TableHead>
                    <TableHead>Đến ngày</TableHead>
                    <TableHead className="text-center">Số ngày</TableHead>
                    <TableHead>Lý do</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderRows(filteredLeaves, false)}</TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Reject Dialog ── */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối đơn nghỉ phép</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối để nhân viên biết. Lý do này sẽ được
              ghi vào đơn.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label
              htmlFor="rejectReason"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <Input
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Không đủ ngày phép, trùng lịch..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Approve Dialog ── */}
      <ConfirmDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        title="Duyệt hàng loạt?"
        description={`Bạn có chắc muốn duyệt ${selectedIds.length} đơn nghỉ phép đã chọn?`}
        confirmText="Duyệt tất cả"
        variant="default"
        onConfirm={handleBulkApprove}
      />
    </div>
  );
}
