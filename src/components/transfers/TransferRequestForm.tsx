"use client";

// ============================================================================
// GK-HRMS — TransferRequestForm (v2 — 3-party workflow)
// BM tạo đề xuất: chỉ điền nhu cầu, KHÔNG chọn CN nguồn hay NV (khi receive)
// ============================================================================

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAccountStore } from "@/store/accountStore";
import {
  POSITION_LIST,
  TRANSFER_REQUEST_TYPE_CONFIG,
  TRANSFER_DIRECTION_CONFIG,
} from "@/types/employee";
import type { TransferRequestType, TransferDirection } from "@/types/employee";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferRequestForm({ open, onOpenChange }: Props) {
  const [requestType, setRequestType] = useState<TransferRequestType>("temporary");
  const [direction, setDirection] = useState<TransferDirection>("receive");
  const [requiredPosition, setRequiredPosition] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [requestedStartDate, setRequestedStartDate] = useState("");
  const [requestedEndDate, setRequestedEndDate] = useState("");
  // For direction='send', BM can pick employee from their branch
  const [sendEmployeeId, setSendEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const requestTransfer = useTransferStore((s) => s.requestTransfer);
  const employees = useEmployeeStore((s) => s.employees);
  const currentUser = useAccountStore((s) => s.currentUser);

  const today = new Date().toISOString().split("T")[0];

  // Employees from current user's branch (for direction='send')
  const myBranchEmployees = employees.filter(
    (e) => e.branchId === currentUser.branchId && e.status === "active"
  );

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!requiredPosition) errs.requiredPosition = "Vui lòng chọn vị trí";
    if (requiredQuantity < 1) errs.requiredQuantity = "Số lượng tối thiểu là 1";
    if (reason.trim().length < 10) errs.reason = "Lý do tối thiểu 10 ký tự";
    if (!requestedStartDate) errs.requestedStartDate = "Vui lòng nhập ngày";
    else if (requestedStartDate < today)
      errs.requestedStartDate = "Ngày bắt đầu phải từ hôm nay trở đi";
    if (requestType === "temporary") {
      if (!requestedEndDate)
        errs.requestedEndDate = "Vui lòng nhập ngày kết thúc";
      else if (requestedEndDate <= requestedStartDate)
        errs.requestedEndDate = "Ngày kết thúc phải sau ngày bắt đầu";
    }
    if (direction === "send" && !sendEmployeeId)
      errs.sendEmployeeId = "Vui lòng chọn nhân viên muốn điều chuyển";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    const emp = direction === "send"
      ? employees.find((e) => e.id === sendEmployeeId)
      : null;

    try {
      await requestTransfer({
        requestType,
        direction,
        employeeId: emp?.id || null,
        employeeName: emp?.name || null,
        requiredPosition,
        requiredQuantity,
        reason: reason.trim(),
        requestedStartDate,
        requestedEndDate: requestType === "temporary" ? requestedEndDate : null,
      });
      // Reset form
      setRequestType("temporary");
      setDirection("receive");
      setRequiredPosition("");
      setRequiredQuantity(1);
      setReason("");
      setRequestedStartDate("");
      setRequestedEndDate("");
      setSendEmployeeId("");
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
            <Send className="h-5 w-5 text-blue-600" />
            Tạo đề xuất điều chuyển / hỗ trợ
          </DialogTitle>
          <DialogDescription>
            Mô tả nhu cầu nhân sự — HR sẽ điều phối và tìm chi nhánh phù hợp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Loại đề xuất <span className="text-red-500">*</span>
            </label>
            <Select
              value={requestType}
              onValueChange={(v) => v && setRequestType(v as TransferRequestType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRANSFER_REQUEST_TYPE_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label_vi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Direction */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Hướng đề xuất <span className="text-red-500">*</span>
            </label>
            <Select
              value={direction}
              onValueChange={(v) => {
                if (!v) return;
                setDirection(v as TransferDirection);
                setSendEmployeeId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRANSFER_DIRECTION_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label_vi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Position — dropdown select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Vị trí cần <span className="text-red-500">*</span>
            </label>
            <Select
              value={requiredPosition}
              onValueChange={(v) => v && setRequiredPosition(v)}
            >
              <SelectTrigger
                className={errors.requiredPosition ? "border-red-400" : ""}
              >
                <SelectValue placeholder="-- Chọn vị trí --" />
              </SelectTrigger>
              <SelectContent>
                {POSITION_LIST.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.requiredPosition && (
              <p className="mt-1 text-xs text-red-500">
                {errors.requiredPosition}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Số lượng cần <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={1}
              value={requiredQuantity}
              onChange={(e) => setRequiredQuantity(Number(e.target.value))}
              className={errors.requiredQuantity ? "border-red-400" : ""}
            />
            {errors.requiredQuantity && (
              <p className="mt-1 text-xs text-red-500">
                {errors.requiredQuantity}
              </p>
            )}
          </div>

          {/* If direction='send', pick employee from own branch */}
          {direction === "send" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Nhân viên muốn điều chuyển <span className="text-red-500">*</span>
              </label>
              <Select
                value={sendEmployeeId}
                onValueChange={(v) => v && setSendEmployeeId(v)}
              >
                <SelectTrigger
                  className={errors.sendEmployeeId ? "border-red-400" : ""}
                >
                  <SelectValue placeholder="-- Chọn NV --" />
                </SelectTrigger>
                <SelectContent>
                  {myBranchEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} — {e.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sendEmployeeId && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.sendEmployeeId}
                </p>
              )}
            </div>
          )}

          {/* Start date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Ngày cần có người <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={requestedStartDate}
              onChange={(e) => setRequestedStartDate(e.target.value)}
              min={today}
              className={errors.requestedStartDate ? "border-red-400" : ""}
            />
            {errors.requestedStartDate && (
              <p className="mt-1 text-xs text-red-500">
                {errors.requestedStartDate}
              </p>
            )}
          </div>

          {/* End date — temporary only */}
          {requestType === "temporary" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={requestedEndDate}
                onChange={(e) => setRequestedEndDate(e.target.value)}
                min={requestedStartDate || today}
                className={errors.requestedEndDate ? "border-red-400" : ""}
              />
              {errors.requestedEndDate && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.requestedEndDate}
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Lý do <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mô tả lý do cần bổ sung / điều chuyển nhân sự..."
              rows={3}
              className={errors.reason ? "border-red-400" : ""}
              id="transfer-reason"
            />
            {errors.reason && (
              <p className="mt-1 text-xs text-red-500">{errors.reason}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-1.5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Gửi đề xuất
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
