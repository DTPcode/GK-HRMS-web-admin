"use client";

import type { Employee } from "@/types/employee";

// ============================================================================
// GK-HRMS — SourceResponseDialog
// BM nguồn Accept (chọn NV) hoặc Reject (lý do)
// ============================================================================

import { useState, useEffect, useMemo } from "react";
import { CheckCircle, XCircle, User } from "lucide-react";
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
import { useAccountStore } from "@/store/accountStore";
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

export function SourceResponseDialog({ transfer, open, onOpenChange }: Props) {
  const [mode, setMode] = useState<"accept" | "reject">("accept");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const acceptDispatch = useTransferStore((s) => s.acceptDispatch);
  const rejectDispatch = useTransferStore((s) => s.rejectDispatch);
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const currentUser = useAccountStore((s) => s.currentUser);

  useEffect(() => {
    if (open && employees.length === 0) {
      fetchEmployees();
    }
  }, [open, employees.length, fetchEmployees]);

  useEffect(() => {
    if (open) {
      setMode("accept");
      setSelectedEmployeeId("");
      setNote("");
    }
  }, [open]);

  // Employees from source branch (current user's branch)
  const branchEmployees = useMemo(() => {
    if (!transfer) return [];
    const branchId = currentUser.branchId;
    if (!branchId) return [];

    return employees
      .filter((e) => e.branchId === branchId && e.status === "active")
      .map((e) => {
        const isMatch =
          e.position.toLowerCase().includes(transfer.requiredPosition.toLowerCase()) ||
          transfer.requiredPosition.toLowerCase().includes(e.position.toLowerCase());
        return { ...e, isMatch };
      })
      .sort((a, b) => (b.isMatch ? 1 : 0) - (a.isMatch ? 1 : 0));
  }, [employees, transfer, currentUser.branchId]);

  if (!transfer) return null;

  const requestedBranch = BRANCH_LIST.find(
    (b) => b.id === transfer.requestedByBranchId
  );
  const typeConfig = TRANSFER_REQUEST_TYPE_CONFIG[transfer.type];

  const handleAccept = async () => {
    if (!selectedEmployeeId) return;
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;

    setLoading(true);
    try {
      await acceptDispatch(transfer.id, {
        employeeId: emp.id,
        employeeName: emp.name,
        note: note.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (note.trim().length < 10) return;
    setLoading(true);
    try {
      await rejectDispatch(transfer.id, note.trim());
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
            {mode === "accept" ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            Phản hồi yêu cầu từ HR
          </DialogTitle>
          <DialogDescription>
            HR yêu cầu chi nhánh bạn{" "}
            {transfer.type === "permanent" ? "điều chuyển" : "cho mượn"} nhân
            sự.
          </DialogDescription>
        </DialogHeader>

        {/* ── Info section ── */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500">Loại:</span>
              <p className="font-medium text-slate-800">
                {typeConfig.label_vi}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Chi nhánh cần:</span>
              <p className="font-medium text-slate-800">
                {requestedBranch?.name.replace("Gia Khánh - ", "") ?? "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Vị trí:</span>
              <p className="font-medium text-slate-800">
                {transfer.requiredPosition}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Từ ngày:</span>
              <p className="font-medium text-slate-800">
                {transfer.requestedStartDate}
              </p>
            </div>
          </div>
          {transfer.hrDispatchNote && (
            <div className="mt-2 border-t border-slate-200 pt-2">
              <span className="text-slate-500">Ghi chú HR:</span>
              <p className="mt-0.5 italic text-slate-600">
                {transfer.hrDispatchNote}
              </p>
            </div>
          )}
        </div>

        {/* ── Mode toggle ── */}
        <div className="flex gap-2">
          <Button
            variant={mode === "accept" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("accept")}
            className={
              mode === "accept"
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }
          >
            <CheckCircle className="mr-1.5 h-4 w-4" />
            Chấp nhận
          </Button>
          <Button
            variant={mode === "reject" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("reject")}
            className={
              mode === "reject"
                ? "bg-red-600 hover:bg-red-700"
                : ""
            }
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Từ chối
          </Button>
        </div>

        {mode === "accept" ? (
          <>
            {/* ── Employee select ── */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Chọn nhân viên sẽ đi{" "}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedEmployeeId}
                onValueChange={(v) => v && setSelectedEmployeeId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Chọn nhân viên --" />
                </SelectTrigger>
                <SelectContent>
                  {branchEmployees.map((e: Employee & { isMatch: boolean }) => (
                    <SelectItem key={e.id} value={e.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{e.name}</span>
                        <span className="text-xs text-slate-400">
                          — {e.position}
                        </span>
                        {e.isMatch && (
                          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                            Phù hợp
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-slate-400">
                Hiện {branchEmployees.length} NV active tại chi nhánh bạn
              </p>
            </div>

            {/* ── Note (optional) ── */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Ghi chú thêm cho HR (tùy chọn)
              </label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: NV này đang rảnh tháng tới..."
                rows={2}
              />
            </div>
          </>
        ) : (
          <>
            {/* ── Reject reason ── */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Hiện tại không đủ nhân sự để điều chuyển..."
                rows={3}
              />
              {note.trim().length > 0 && note.trim().length < 10 && (
                <p className="mt-1 text-xs text-red-500">
                  Lý do tối thiểu 10 ký tự
                </p>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Đóng
          </Button>
          {mode === "accept" ? (
            <Button
              onClick={handleAccept}
              disabled={!selectedEmployeeId || loading}
              className="gap-1.5 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              {loading ? "Đang xử lý..." : "Chấp nhận & Chọn NV"}
            </Button>
          ) : (
            <Button
              onClick={handleReject}
              disabled={note.trim().length < 10 || loading}
              variant="destructive"
              className="gap-1.5"
            >
              <XCircle className="h-4 w-4" />
              {loading ? "Đang xử lý..." : "Từ chối"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
