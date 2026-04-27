"use client";

// ============================================================================
// GK-HRMS — OffboardingPageClient
// Trang quản lý nghỉ việc — 3 tabs: Chờ duyệt | Đã duyệt | Hoàn tất
// ============================================================================

import { useEffect, useState, useCallback } from "react";
import { UserMinus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ResignationTable } from "@/components/offboarding/ResignationTable";
import { ResignationForm } from "@/components/offboarding/ResignationForm";
import { OffboardingChecklist } from "@/components/offboarding/OffboardingChecklist";
import { useOffboardingStore } from "@/store/offboardingStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { useAccountStore } from "@/store/accountStore";
import type { ResignationRequest } from "@/types/offboarding";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OffboardingPageClient() {
  // ── Store ──
  const {
    fetchRequests,
    submitResignation,
    approveResignation,
    rejectResignation,
    completeOffboarding,
    pendingRequests,
    approvedRequests,
    requests,
    loading,
  } = useOffboardingStore();

  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const currentRole = useAccountStore((s) => s.currentUser.role);

  // ── Local state ──
  const [mounted, setMounted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Approve/Reject confirm
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Complete checklist
  const [completeTarget, setCompleteTarget] = useState<ResignationRequest | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);

  // ── Derived ──
  const canCreate = currentRole === "super_admin" || currentRole === "hr_admin" || currentRole === "branch_manager";
  const canApprove = currentRole === "super_admin" || currentRole === "hr_admin";
  const pending = pendingRequests();
  const approved = approvedRequests();
  const finished = requests.filter(
    (r) => r.status === "completed" || r.status === "rejected"
  );

  // ── Effects ──
  useEffect(() => {
    setMounted(true);
    fetchRequests();
    if (employees.length === 0) fetchEmployees();
  }, [fetchRequests, employees.length, fetchEmployees]);

  // ── Handler: Submit new ──
  const handleFormSubmit = useCallback(
    async (data: {
      employeeId: string;
      type: "voluntary" | "terminated" | "retired" | "contract_end";
      submittedDate: string;
      lastWorkingDate: string;
      reason: string;
      handoverNote?: string;
    }) => {
      // Check NV đã resigned chưa
      const emp = employees.find((e) => e.id === data.employeeId);
      if (emp?.status === "resigned") {
        toast.error("Nhân viên này đã nghỉ việc, không thể tạo đơn mới.");
        return;
      }

      setFormLoading(true);
      try {
        await submitResignation(data);
        toast.success("Đã nộp đơn nghỉ việc");
        setFormOpen(false);
      } catch {
        toast.error("Không thể nộp đơn nghỉ việc. Vui lòng thử lại.");
      } finally {
        setFormLoading(false);
      }
    },
    [submitResignation, employees]
  );

  // ── Handler: Approve ──
  const handleConfirmApprove = useCallback(async () => {
    // Capture target ID immediately to prevent stale closure from Dialog.onOpenChange
    const targetId = approveTarget;
    if (!targetId) return;

    // Guard: không duyệt nếu NV đã resigned
    const req = requests.find((r) => r.id === targetId);
    if (req) {
      const emp = employees.find((e) => e.id === req.employeeId);
      if (emp?.status === "resigned") {
        toast.error("Nhân viên này đã nghỉ việc, không thể duyệt.");
        setApproveTarget(null);
        return;
      }
    }

    setApproveLoading(true);
    try {
      await approveResignation(targetId);
    } catch {
      toast.error("Không thể duyệt đơn. Vui lòng thử lại.");
    } finally {
      setApproveLoading(false);
      setApproveTarget(null);
    }
  }, [approveTarget, approveResignation, requests, employees]);

  // ── Handler: Reject ──
  const handleConfirmReject = useCallback(async () => {
    const targetId = rejectTarget;
    const reason = rejectReason.trim();
    if (!targetId || !reason) return;

    setRejectLoading(true);
    try {
      await rejectResignation(targetId, reason);
    } catch {
      toast.error("Không thể từ chối đơn. Vui lòng thử lại.");
    } finally {
      setRejectLoading(false);
      setRejectTarget(null);
      setRejectReason("");
    }
  }, [rejectTarget, rejectReason, rejectResignation]);

  // ── Handler: Complete ──
  const handleComplete = useCallback(
    async (id: string, note: string) => {
      setCompleteLoading(true);
      try {
        await completeOffboarding(id, note);
        toast.success("Hoàn tất quy trình nghỉ việc");
        setCompleteTarget(null);
      } catch {
        toast.error("Không thể hoàn tất. Vui lòng thử lại.");
      } finally {
        setCompleteLoading(false);
      }
    },
    [completeOffboarding]
  );

  // ── Loading ──
  if (!mounted || loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserMinus className="h-6 w-6 text-red-500" />
            Quản lý nghỉ việc
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem và quản lý đơn nghỉ việc, quy trình offboarding
          </p>
        </div>

        {canCreate && (
          <Button onClick={() => setFormOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Tạo đơn nghỉ việc
          </Button>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            Chờ duyệt
            {pending.length > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-medium text-white">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5">
            Đã duyệt
            {approved.length > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-500 px-1.5 text-xs font-medium text-white">
                {approved.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="finished">Hoàn tất</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <ResignationTable
              requests={pending}
              onApprove={canApprove ? (id) => setApproveTarget(id) : undefined}
              onReject={canApprove ? (id) => setRejectTarget(id) : undefined}
            />
          </div>
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <ResignationTable
              requests={approved}
              onComplete={canApprove ? (req) => setCompleteTarget(req) : undefined}
            />
          </div>
        </TabsContent>

        <TabsContent value="finished" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <ResignationTable requests={finished} />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── New Resignation Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Tạo đơn nghỉ việc</DialogTitle>
          </DialogHeader>
          <ResignationForm onSubmit={handleFormSubmit} isLoading={formLoading} />
        </DialogContent>
      </Dialog>

      {/* ── Approve Confirm ── */}
      <ConfirmDialog
        open={approveTarget !== null}
        onOpenChange={(open) => {
          if (!open && !approveLoading) setApproveTarget(null);
        }}
        title="Duyệt đơn nghỉ việc?"
        description="Sau khi duyệt, trạng thái nhân viên sẽ chuyển sang 'Đã nghỉ việc'. NV vẫn cần hoàn tất bàn giao trước khi kết thúc."
        confirmText="Duyệt đơn"
        variant="default"
        onConfirm={handleConfirmApprove}
        loading={approveLoading}
      />

      {/* ── Reject Dialog ── */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open && !rejectLoading) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Từ chối đơn nghỉ việc</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label
              htmlFor="reject-reason"
              className="block text-sm font-medium text-slate-700"
            >
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              disabled={rejectLoading}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
              placeholder="Nhập lý do từ chối..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={rejectLoading}
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || rejectLoading}
                onClick={handleConfirmReject}
              >
                {rejectLoading ? "Đang xử lý..." : "Từ chối"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Complete Checklist ── */}
      <OffboardingChecklist
        open={completeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCompleteTarget(null);
        }}
        request={completeTarget}
        onComplete={handleComplete}
        loading={completeLoading}
      />
    </div>
  );
}
