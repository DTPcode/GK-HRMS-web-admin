"use client";

// ============================================================================
// GK-HRMS — TransferExecutionDialog (v2)
// HR xác nhận chính thức — phase approved → active
// Pre-filled with employee/branch from source acceptance
// ============================================================================

import { useState, useEffect } from "react";
import { CheckCircle, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Transfer } from "@/types/employee";
import {
  BRANCH_LIST,
  POSITION_LIST,
  TRANSFER_REQUEST_TYPE_CONFIG,
} from "@/types/employee";

interface Props {
  transfer: Transfer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferExecutionDialog({ transfer, open, onOpenChange }: Props) {
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [decisionNumber, setDecisionNumber] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allowance, setAllowance] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const executeTransfer = useTransferStore((s) => s.executeTransfer);

  // Prefill from transfer data
  useEffect(() => {
    if (open && transfer) {
      // Source branch = where employee comes from
      setFromBranchId(transfer.sourceBranchId || "");
      // Destination = requesting branch
      setToBranchId(transfer.requestedByBranchId || "");
      setEffectiveDate(transfer.requestedStartDate || "");
      setNewPosition("");
      setDecisionNumber("");
      setEndDate(transfer.requestedEndDate || "");
      setAllowance("");
      setErrors({});
    }
  }, [open, transfer]);

  if (!transfer) return null;

  const typeConfig = TRANSFER_REQUEST_TYPE_CONFIG[transfer.type];
  const today = new Date().toISOString().split("T")[0];

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fromBranchId) errs.fromBranchId = "Vui lòng chọn chi nhánh đi";
    if (!toBranchId) errs.toBranchId = "Vui lòng chọn chi nhánh đến";
    if (!effectiveDate) errs.effectiveDate = "Vui lòng nhập ngày hiệu lực";
    else if (effectiveDate < today)
      errs.effectiveDate = "Ngày hiệu lực phải từ hôm nay trở đi";
    if (fromBranchId === toBranchId)
      errs.toBranchId = "Chi nhánh đến phải khác chi nhánh đi";
    if (transfer.type === "temporary" && endDate && endDate <= effectiveDate)
      errs.endDate = "Ngày kết thúc phải sau ngày hiệu lực";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await executeTransfer(transfer.id, {
        fromBranchId,
        toBranchId,
        effectiveDate,
        newPosition: newPosition || undefined,
        decisionNumber: decisionNumber || undefined,
        endDate: endDate || undefined,
        allowance: allowance ? Number(allowance) : undefined,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Xác nhận chính thức
          </DialogTitle>
          <DialogDescription>
            {typeConfig.label_vi} — Nhân viên{" "}
            <strong>{transfer.employeeName ?? "—"}</strong> đã được chi nhánh
            nguồn chấp nhận.
          </DialogDescription>
        </DialogHeader>

        {/* ── Info ── */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Nhân viên:</span>
              <p className="font-medium">{transfer.employeeName ?? "—"}</p>
            </div>
            <div>
              <span className="text-slate-500">Vị trí cần:</span>
              <p className="font-medium">{transfer.requiredPosition}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* From branch */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Chi nhánh đi <span className="text-red-500">*</span>
            </label>
            <Select value={fromBranchId} onValueChange={(v) => v && setFromBranchId(v)}>
              <SelectTrigger className={errors.fromBranchId ? "border-red-400" : ""}>
                <SelectValue placeholder="-- Chọn --" />
              </SelectTrigger>
              <SelectContent>
                {BRANCH_LIST.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name.replace("Gia Khánh - ", "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.fromBranchId && (
              <p className="mt-1 text-xs text-red-500">{errors.fromBranchId}</p>
            )}
          </div>

          {/* To branch */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Chi nhánh đến <span className="text-red-500">*</span>
            </label>
            <Select value={toBranchId} onValueChange={(v) => v && setToBranchId(v)}>
              <SelectTrigger className={errors.toBranchId ? "border-red-400" : ""}>
                <SelectValue placeholder="-- Chọn --" />
              </SelectTrigger>
              <SelectContent>
                {BRANCH_LIST.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name.replace("Gia Khánh - ", "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.toBranchId && (
              <p className="mt-1 text-xs text-red-500">{errors.toBranchId}</p>
            )}
          </div>

          {/* Effective date */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
              <Calendar className="h-3.5 w-3.5" />
              Ngày hiệu lực <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              min={today}
              className={errors.effectiveDate ? "border-red-400" : ""}
            />
            {errors.effectiveDate && (
              <p className="mt-1 text-xs text-red-500">{errors.effectiveDate}</p>
            )}
          </div>

          {/* Permanent-only fields */}
          {transfer.type === "permanent" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Vị trí mới (nếu thay đổi)
                </label>
                <Select value={newPosition} onValueChange={(v) => v && setNewPosition(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Giữ nguyên --" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_LIST.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
                  <FileText className="h-3.5 w-3.5" />
                  Số quyết định
                </label>
                <Input
                  value={decisionNumber}
                  onChange={(e) => setDecisionNumber(e.target.value)}
                  placeholder="VD: QĐ-2026-001"
                />
              </div>
            </>
          )}

          {/* Temporary-only fields */}
          {transfer.type === "temporary" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Ngày kết thúc
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={effectiveDate || today}
                  className={errors.endDate ? "border-red-400" : ""}
                />
                {errors.endDate && (
                  <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Phụ cấp (VNĐ)
                </label>
                <Input
                  type="number"
                  value={allowance}
                  onChange={(e) => setAllowance(e.target.value)}
                  placeholder="VD: 500000"
                />
              </div>
            </>
          )}
        </div>

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
            disabled={loading}
            className="gap-1.5"
          >
            <CheckCircle className="h-4 w-4" />
            {loading ? "Đang xử lý..." : "Xác nhận chính thức"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
