"use client";

// ============================================================================
// GK-HRMS — ConfirmPaymentDialog
// Dialog xác nhận thanh toán lương — chọn hình thức, ngày chi, ghi chú
// ============================================================================

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, CreditCard } from "lucide-react";
import { usePayrollStore } from "@/store/payrollStore";
import { formatCurrency } from "@/lib/utils";
import type { PaymentData, PaymentMethod } from "@/types/payroll";

interface ConfirmPaymentDialogProps {
  /** Dialog có đang mở? */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Danh sách ID records cần thanh toán */
  recordIds: string[];
  /** Tổng tiền thực lĩnh — hiển thị xác nhận */
  totalNetSalary: number;
  /** Số nhân viên bị ảnh hưởng */
  employeeCount: number;
  /** Callback sau khi thanh toán thành công */
  onSuccess?: () => void;
}

export function ConfirmPaymentDialog({
  open,
  onOpenChange,
  recordIds,
  totalNetSalary,
  employeeCount,
  onSuccess,
}: ConfirmPaymentDialogProps) {
  const markAsPaid = usePayrollStore((s) => s.markAsPaid);
  const loading = usePayrollStore((s) => s.loading);

  // Form state — không dùng RHF vì form đơn giản (3 fields)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [paidAt, setPaidAt] = useState(() => {
    // Default: hôm nay — format yyyy-MM-dd cho input[type=date]
    return new Date().toISOString().split("T")[0];
  });
  const [note, setNote] = useState("");

  const isSubmitting = loading;

  const handleSubmit = async () => {
    const payment: PaymentData = {
      paymentMethod,
      paidAt,
      note,
    };

    // markAsPaid xử lý từng record — loop qua danh sách
    for (const id of recordIds) {
      await markAsPaid(id, payment);
    }
    onOpenChange(false);
    onSuccess?.();

    // Reset form
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Xác nhận thanh toán lương
          </DialogTitle>
          <DialogDescription>
            Xác nhận chi trả lương cho{" "}
            <span className="font-semibold text-slate-800">
              {employeeCount} nhân viên
            </span>
            , tổng số tiền{" "}
            <span className="font-semibold text-emerald-700">
              {formatCurrency(totalNetSalary)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Hình thức chi */}
          <div className="space-y-2">
            <label
              htmlFor="payment-method"
              className="text-sm font-medium text-slate-700"
            >
              Hình thức chi <span className="text-red-500">*</span>
            </label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Chọn hình thức" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Chuyển khoản ngân hàng
                  </span>
                </SelectItem>
                <SelectItem value="cash">
                  <span className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Tiền mặt
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ngày chi thực tế */}
          <div className="space-y-2">
            <label
              htmlFor="paid-at"
              className="text-sm font-medium text-slate-700"
            >
              Ngày chi thực tế <span className="text-red-500">*</span>
            </label>
            <Input
              id="paid-at"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="block w-full"
            />
          </div>

          {/* Ghi chú */}
          <div className="space-y-2">
            <label
              htmlFor="payment-note"
              className="text-sm font-medium text-slate-700"
            >
              Ghi chú thanh toán
            </label>
            <Input
              id="payment-note"
              placeholder="Nội dung chuyển khoản, mã giao dịch..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !paidAt}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận thanh toán"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
