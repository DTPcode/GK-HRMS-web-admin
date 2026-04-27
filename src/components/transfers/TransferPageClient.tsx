"use client";

// ============================================================================
// GK-HRMS — TransferPageClient (v2 — 3-party workflow)
// Role-aware tabs:
//   BM: Đề xuất của tôi │ Cần phản hồi │ Đang thực hiện
//   HR: Chờ điều phối │ Chờ CN phản hồi │ Chờ xác nhận │ Đang TH + Lịch sử
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import {
  ArrowRightLeft,
  Plus,
  Inbox,
  Send,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransferStore } from "@/store/transferStore";
import { useAccountStore } from "@/store/accountStore";
import { TransferTable } from "./TransferTable";
import { TransferRequestForm } from "./TransferRequestForm";
import { DispatchDialog } from "./DispatchDialog";
import { SourceResponseDialog } from "./SourceResponseDialog";
import { TransferExecutionDialog } from "./TransferExecutionDialog";
import type { Transfer } from "@/types/employee";

export function TransferPageClient() {
  const { transfers, loading, fetchTransfers, completeTransfer, deleteTransfer } =
    useTransferStore();
  const currentUser = useAccountStore((s) => s.currentUser);

  const [requestOpen, setRequestOpen] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState<Transfer | null>(null);
  const [respondTarget, setRespondTarget] = useState<Transfer | null>(null);
  const [executeTarget, setExecuteTarget] = useState<Transfer | null>(null);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const isHR =
    currentUser.role === "hr_admin" || currentUser.role === "super_admin";
  const isBM = currentUser.role === "branch_manager";
  const myBranchId = currentUser.branchId;

  // ── Computed filtered lists ──

  // BM tabs
  const myRequests = useMemo(
    () =>
      transfers
        .filter((t) => t.requestedByBranchId === myBranchId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [transfers, myBranchId]
  );

  const needsMyResponse = useMemo(
    () =>
      transfers.filter(
        (t) =>
          t.sourceBranchId === myBranchId &&
          t.phase === "pending_source_approval"
      ),
    [transfers, myBranchId]
  );

  const myActive = useMemo(
    () =>
      transfers.filter(
        (t) =>
          t.phase === "active" &&
          (t.requestedByBranchId === myBranchId ||
            t.sourceBranchId === myBranchId ||
            t.fromBranchId === myBranchId ||
            t.toBranchId === myBranchId)
      ),
    [transfers, myBranchId]
  );

  // HR tabs
  const hrRequested = useMemo(
    () => transfers.filter((t) => t.phase === "requested"),
    [transfers]
  );

  const hrPendingSource = useMemo(
    () => transfers.filter((t) => t.phase === "pending_source_approval"),
    [transfers]
  );

  const hrApproved = useMemo(
    () => transfers.filter((t) => t.phase === "approved"),
    [transfers]
  );

  const hrActiveAndHistory = useMemo(
    () =>
      transfers.filter(
        (t) =>
          t.phase === "active" ||
          t.phase === "completed" ||
          t.phase === "rejected_by_source"
      ),
    [transfers]
  );

  // ── Tab badge helper ──
  const Badge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
        {count}
      </span>
    ) : null;

  if (loading && transfers.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              <ArrowRightLeft className="h-6 w-6 text-blue-600" />
              Điều chuyển nhân sự
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý đề xuất và điều phối nhân sự giữa các chi nhánh
            </p>
          </div>
          {isBM && (
            <Button onClick={() => setRequestOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tạo đề xuất
            </Button>
          )}
        </div>

        {/* ═══ BM View ═══ */}
        {isBM && (
          <Tabs defaultValue="my-requests">
            <TabsList>
              <TabsTrigger value="my-requests" className="gap-1.5">
                <Inbox className="h-3.5 w-3.5" />
                Đề xuất của tôi
                <Badge count={myRequests.length} />
              </TabsTrigger>
              <TabsTrigger value="needs-response" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Cần phản hồi
                <Badge count={needsMyResponse.length} />
              </TabsTrigger>
              <TabsTrigger value="my-active" className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                Đang thực hiện
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-requests" className="mt-4">
              <TransferTable transfers={myRequests} />
            </TabsContent>

            <TabsContent value="needs-response" className="mt-4">
              <TransferTable
                transfers={needsMyResponse}
                showColumns={{ hrNote: true }}
                actions={{
                  onRespond: (t) => setRespondTarget(t),
                }}
              />
            </TabsContent>

            <TabsContent value="my-active" className="mt-4">
              <TransferTable
                transfers={myActive}
                showColumns={{ employee: true, sourceBranch: true }}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* ═══ HR View ═══ */}
        {isHR && (
          <Tabs defaultValue="hr-requested">
            <TabsList>
              <TabsTrigger value="hr-requested" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Chờ điều phối
                <Badge count={hrRequested.length} />
              </TabsTrigger>
              <TabsTrigger value="hr-pending-source" className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Chờ CN phản hồi
                <Badge count={hrPendingSource.length} />
              </TabsTrigger>
              <TabsTrigger value="hr-approved" className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                Chờ xác nhận
                <Badge count={hrApproved.length} />
              </TabsTrigger>
              <TabsTrigger value="hr-history" className="gap-1.5">
                <Inbox className="h-3.5 w-3.5" />
                Đang TH + Lịch sử
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hr-requested" className="mt-4">
              <TransferTable
                transfers={hrRequested}
                actions={{
                  onDispatch: (t) => setDispatchTarget(t),
                }}
              />
            </TabsContent>

            <TabsContent value="hr-pending-source" className="mt-4">
              <TransferTable
                transfers={hrPendingSource}
                showColumns={{ sourceBranch: true, hrNote: true }}
              />
            </TabsContent>

            <TabsContent value="hr-approved" className="mt-4">
              <TransferTable
                transfers={hrApproved}
                showColumns={{ employee: true, sourceBranch: true }}
                actions={{
                  onExecute: (t) => setExecuteTarget(t),
                }}
              />
            </TabsContent>

            <TabsContent value="hr-history" className="mt-4">
              <TransferTable
                transfers={hrActiveAndHistory}
                showColumns={{ employee: true, sourceBranch: true }}
                actions={{
                  onComplete: (t) => completeTransfer(t.id),
                  onDelete: (t) => deleteTransfer(t.id),
                }}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Director / Accountant — read-only all */}
        {!isBM && !isHR && (
          <TransferTable
            transfers={transfers}
            showColumns={{ employee: true, sourceBranch: true }}
          />
        )}
      </div>

      {/* ═══ Dialogs ═══ */}
      <TransferRequestForm open={requestOpen} onOpenChange={setRequestOpen} />
      <DispatchDialog
        transfer={dispatchTarget}
        open={!!dispatchTarget}
        onOpenChange={(v) => !v && setDispatchTarget(null)}
      />
      <SourceResponseDialog
        transfer={respondTarget}
        open={!!respondTarget}
        onOpenChange={(v) => !v && setRespondTarget(null)}
      />
      <TransferExecutionDialog
        transfer={executeTarget}
        open={!!executeTarget}
        onOpenChange={(v) => !v && setExecuteTarget(null)}
      />
    </>
  );
}
