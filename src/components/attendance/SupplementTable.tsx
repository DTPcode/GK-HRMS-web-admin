"use client";

// ============================================================================
// GK-HRMS — SupplementTable
// Bảng yêu cầu bổ sung công — sub-tabs: Chờ duyệt | Đã duyệt | Đã từ chối
// Hỗ trợ bulk approve cho tab 'Chờ duyệt'
// ============================================================================

import { useState, useCallback } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SUPPLEMENT_TYPE_CONFIG,
  SUPPLEMENT_STATUS_CONFIG,
} from "@/types/supplement";
import type { AttendanceSupplement } from "@/types/supplement";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SupplementTableProps {
  supplements: AttendanceSupplement[];
  employeeMap: Map<string, string>;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onBulkApprove?: (ids: string[]) => void;
  canApprove: boolean;
}

// ---------------------------------------------------------------------------
// Sub-component: Row table
// ---------------------------------------------------------------------------

function SupplementRows({
  items,
  employeeMap,
  onApprove,
  onReject,
  canApprove,
  selectedIds,
  onToggleSelect,
  showCheckbox,
}: {
  items: AttendanceSupplement[];
  employeeMap: Map<string, string>;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  canApprove: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  showCheckbox: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-slate-500">Không có yêu cầu nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            {showCheckbox && <th className="px-3 py-3 w-10" />}
            <th className="px-4 py-3 font-medium text-slate-500">Nhân viên</th>
            <th className="px-4 py-3 font-medium text-slate-500">Loại yêu cầu</th>
            <th className="px-4 py-3 font-medium text-slate-500">Ngày</th>
            <th className="px-4 py-3 font-medium text-slate-500">Giờ vào</th>
            <th className="px-4 py-3 font-medium text-slate-500">Giờ ra</th>
            <th className="px-4 py-3 font-medium text-slate-500">Lý do</th>
            {canApprove && (
              <th className="px-4 py-3 font-medium text-slate-500">Thao tác</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const typeConfig = SUPPLEMENT_TYPE_CONFIG[item.type];
            const empName = employeeMap.get(item.employeeId) ?? item.employeeId;

            return (
              <tr
                key={item.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                {showCheckbox && (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => onToggleSelect(item.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                )}

                <td className="px-4 py-3 font-medium text-slate-800">
                  {empName}
                </td>

                <td className="px-4 py-3">
                  <Badge
                    className={cn("text-xs font-medium", typeConfig.badgeColor)}
                    variant="outline"
                  >
                    {typeConfig.label_vi}
                  </Badge>
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {formatDate(item.date)}
                </td>

                <td className="px-4 py-3 font-mono text-slate-600">
                  {item.requestedCheckIn ?? "—"}
                </td>

                <td className="px-4 py-3 font-mono text-slate-600">
                  {item.requestedCheckOut ?? "—"}
                </td>

                <td className="px-4 py-3 max-w-[180px] truncate text-slate-600">
                  {item.reason}
                </td>

                {canApprove && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {item.status === "pending" && (
                        <>
                          {onApprove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onApprove(item.id)}
                              className="h-8 gap-1 text-emerald-600 hover:bg-emerald-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Duyệt
                            </Button>
                          )}
                          {onReject && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onReject(item.id)}
                              className="h-8 gap-1 text-red-600 hover:bg-red-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              Từ chối
                            </Button>
                          )}
                        </>
                      )}
                      {item.status === "rejected" && item.rejectionReason && (
                        <span
                          className="text-xs text-red-500 max-w-[120px] truncate"
                          title={item.rejectionReason}
                        >
                          {item.rejectionReason}
                        </span>
                      )}
                      {(item.status === "approved" && !onApprove) && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SupplementTable({
  supplements,
  employeeMap,
  onApprove,
  onReject,
  onBulkApprove,
  canApprove,
}: SupplementTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const pending = supplements.filter((s) => s.status === "pending");
  const approved = supplements.filter((s) => s.status === "approved");
  const rejected = supplements.filter((s) => s.status === "rejected");

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkApprove = useCallback(() => {
    if (onBulkApprove && selectedIds.size > 0) {
      onBulkApprove(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [onBulkApprove, selectedIds]);

  const handleRejectConfirm = useCallback(() => {
    if (rejectTarget && rejectReason.trim() && onReject) {
      onReject(rejectTarget, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason("");
    }
  }, [rejectTarget, rejectReason, onReject]);

  return (
    <>
      <Tabs defaultValue="pending" className="w-full">
        <div className="flex items-center justify-between border-b border-slate-200 px-4">
          <TabsList className="border-0 bg-transparent p-0">
            <TabsTrigger value="pending" className="gap-1.5">
              Chờ duyệt
              {pending.length > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-medium text-white">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Đã duyệt ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Đã từ chối ({rejected.length})
            </TabsTrigger>
          </TabsList>

          {/* Bulk approve button */}
          {canApprove && selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleBulkApprove}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="h-3.5 w-3.5" />
              Duyệt {selectedIds.size} yêu cầu
            </Button>
          )}
        </div>

        <TabsContent value="pending" className="mt-0">
          <SupplementRows
            items={pending}
            employeeMap={employeeMap}
            onApprove={canApprove ? onApprove : undefined}
            onReject={canApprove ? (id) => setRejectTarget(id) : undefined}
            canApprove={canApprove}
            selectedIds={selectedIds}
            onToggleSelect={handleToggle}
            showCheckbox={canApprove}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-0">
          <SupplementRows
            items={approved}
            employeeMap={employeeMap}
            canApprove={false}
            selectedIds={new Set()}
            onToggleSelect={() => {}}
            showCheckbox={false}
          />
        </TabsContent>

        <TabsContent value="rejected" className="mt-0">
          <SupplementRows
            items={rejected}
            employeeMap={employeeMap}
            canApprove={canApprove}
            selectedIds={new Set()}
            onToggleSelect={() => {}}
            showCheckbox={false}
          />
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Từ chối yêu cầu bổ sung
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label
              htmlFor="supp-reject-reason"
              className="block text-sm font-medium text-slate-700"
            >
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <textarea
              id="supp-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="Nhập lý do từ chối (tối thiểu 5 ký tự)..."
            />
            <div className="flex justify-end gap-2">
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
                disabled={rejectReason.trim().length < 5}
                onClick={handleRejectConfirm}
              >
                Từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
