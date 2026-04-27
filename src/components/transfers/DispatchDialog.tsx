"use client";

// ============================================================================
// GK-HRMS — DispatchDialog
// HR chọn chi nhánh nguồn + gửi phiếu đề nghị
// ============================================================================

import { useState, useEffect, useMemo } from "react";
import { Send, Building2, Users, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransferStore } from "@/store/transferStore";
import { useEmployeeStore } from "@/store/employeeStore";
import type { Transfer } from "@/types/employee";
import {
  BRANCH_LIST,
  TRANSFER_REQUEST_TYPE_CONFIG,
} from "@/types/employee";

interface Props {
  transfer: Transfer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DispatchDialog({ transfer, open, onOpenChange }: Props) {
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [hrDispatchNote, setHrDispatchNote] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatchToSource = useTransferStore((s) => s.dispatchToSource);
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);

  useEffect(() => {
    if (open && employees.length === 0) {
      fetchEmployees();
    }
  }, [open, employees.length, fetchEmployees]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSourceBranchId("");
      setHrDispatchNote("");
    }
  }, [open]);

  // Chi nhánh stats — count employees with matching position per branch
  const branchStats = useMemo(() => {
    if (!transfer) return [];
    const targetPosition = transfer.requiredPosition.toLowerCase();

    return BRANCH_LIST
      .filter((b) => b.id !== transfer.requestedByBranchId) // exclude requesting branch
      .map((branch) => {
        const branchEmployees = employees.filter(
          (e) => e.branchId === branch.id && e.status === "active"
        );
        const matchingPosition = branchEmployees.filter(
          (e) => e.position.toLowerCase().includes(targetPosition) ||
                 targetPosition.includes(e.position.toLowerCase())
        );
        return {
          ...branch,
          totalEmployees: branchEmployees.length,
          matchingCount: matchingPosition.length,
        };
      })
      .sort((a, b) => b.matchingCount - a.matchingCount);
  }, [employees, transfer]);

  if (!transfer) return null;

  const requestedBranch = BRANCH_LIST.find(
    (b) => b.id === transfer.requestedByBranchId
  );
  const typeConfig = TRANSFER_REQUEST_TYPE_CONFIG[transfer.type];

  const handleSubmit = async () => {
    if (!sourceBranchId) return;
    setLoading(true);
    try {
      await dispatchToSource(transfer.id, {
        sourceBranchId,
        hrDispatchNote: hrDispatchNote.trim(),
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Điều phối nhân sự
          </DialogTitle>
          <DialogDescription>
            Chọn chi nhánh cung cấp nhân sự cho đề xuất này.
          </DialogDescription>
        </DialogHeader>

        {/* ── Info section — readonly ── */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500">Chi nhánh cần:</span>
              <p className="font-medium text-slate-800">
                {requestedBranch?.name.replace("Gia Khánh - ", "") ?? "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Loại:</span>
              <p className="font-medium text-slate-800">{typeConfig.label_vi}</p>
            </div>
            <div>
              <span className="text-slate-500">Vị trí cần:</span>
              <p className="font-medium text-slate-800">
                {transfer.requiredPosition} × {transfer.requiredQuantity}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Từ ngày:</span>
              <p className="font-medium text-slate-800">
                {transfer.requestedStartDate}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-slate-500">Lý do:</span>
            <p className="mt-0.5 text-slate-700">{transfer.reason}</p>
          </div>
        </div>

        {/* ── Branch stats table ── */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Users className="h-4 w-4" />
            Thống kê nhân sự theo chi nhánh
          </div>
          <div className="max-h-40 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Chi nhánh</th>
                  <th className="px-3 py-2 text-center">Tổng NV</th>
                  <th className="px-3 py-2 text-center">Vị trí phù hợp</th>
                </tr>
              </thead>
              <tbody>
                {branchStats.map((b) => (
                  <tr
                    key={b.id}
                    className={`border-t border-slate-100 ${
                      b.matchingCount > 0 ? "bg-green-50/50" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-slate-700">
                      {b.name.replace("Gia Khánh - ", "")}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {b.totalEmployees}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {b.matchingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {b.matchingCount} ⭐
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Source branch select ── */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Chọn chi nhánh cung cấp nhân sự{" "}
            <span className="text-red-500">*</span>
          </label>
          <Select value={sourceBranchId} onValueChange={(v) => v && setSourceBranchId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="-- Chọn chi nhánh --" />
            </SelectTrigger>
            <SelectContent>
              {branchStats.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {b.name.replace("Gia Khánh - ", "")}
                    {b.matchingCount > 0 && (
                      <span className="ml-1 text-xs text-green-600">
                        ({b.matchingCount} phù hợp)
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Note ── */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Ghi chú cho Quản lý chi nhánh
          </label>
          <Textarea
            value={hrDispatchNote}
            onChange={(e) => setHrDispatchNote(e.target.value)}
            placeholder="VD: Chi nhánh Q1 đang dư nhân sự tháng này..."
            rows={3}
          />
        </div>

        {sourceBranchId && (
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Phiếu đề nghị sẽ được gửi đến Quản lý{" "}
              <strong>
                {BRANCH_LIST.find((b) => b.id === sourceBranchId)?.name.replace(
                  "Gia Khánh - ",
                  ""
                )}
              </strong>
              . Quản lý chi nhánh sẽ chọn nhân viên cụ thể và phản hồi.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!sourceBranchId || loading}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            {loading ? "Đang gửi..." : "Gửi phiếu đề nghị"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
