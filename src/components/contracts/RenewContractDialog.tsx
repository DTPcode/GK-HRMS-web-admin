"use client";

// ============================================================================
// GK-HRMS — RenewContractDialog
// Dialog gia hạn hợp đồng: đóng HĐ cũ, tạo HĐ mới
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
import { useContractStore } from "@/store/contractStore";
import type { Contract } from "@/types/contract";

interface RenewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hợp đồng cũ cần gia hạn */
  contract: Contract;
}

export function RenewContractDialog({
  open,
  onOpenChange,
  contract,
}: RenewContractDialogProps) {
  const { renewContract, loading } = useContractStore();
  const [newEndDate, setNewEndDate] = useState("");
  const [newSalary, setNewSalary] = useState(contract.baseSalary);

  const handleRenew = async () => {
    // TODO: validate newEndDate > contract.endDate
    await renewContract(contract.id, newEndDate || null, newSalary);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gia hạn hợp đồng</DialogTitle>
          <DialogDescription>
            Gia hạn hợp đồng {contract.id.slice(0, 8)} cho nhân viên{" "}
            {contract.employeeId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Ngày kết thúc mới
            </label>
            <Input
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Mức lương mới (VND)
            </label>
            <Input
              type="number"
              value={newSalary}
              onChange={(e) => setNewSalary(Number(e.target.value))}
            />
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
          <Button
            onClick={handleRenew}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Gia hạn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
