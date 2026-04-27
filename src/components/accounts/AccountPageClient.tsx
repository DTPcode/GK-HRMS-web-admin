"use client";

// ============================================================================
// GK-HRMS — AccountPageClient
// Trang quản lý tài khoản: danh sách + tạo/sửa + nhật ký thao tác
// ============================================================================

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { AccountTable } from "@/components/accounts/AccountTable";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AuditLogTable } from "@/components/accounts/AuditLogTable";
import { AuditLogFilter } from "@/components/accounts/AuditLogFilter";
import { DataLockPanel } from "@/components/accounts/DataLockPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { useAccountStore } from "@/store/accountStore";
import { useSupplementStore } from "@/store/supplementStore";
import { usePermission } from "@/hooks/usePermission";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AuditAction, AuditModule, AuditLog } from "@/types/supplement";

export function AccountPageClient() {
  // ── Store (individual selectors → chỉ re-render khi slice thay đổi) ──
  const accounts = useAccountStore((s) => s.accounts);
  const loading = useAccountStore((s) => s.loading);
  const error = useAccountStore((s) => s.error);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const currentRole = useAccountStore((s) => s.currentUser.role);
  const canCreate = usePermission("account", "create");
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<import("@/types/account").UserAccount | null>(null);

  // ── Audit log ──
  const auditLogs = useSupplementStore((s) => s.auditLogs);
  const auditLoading = useSupplementStore((s) => s.loading);
  const fetchAuditLogs = useSupplementStore((s) => s.fetchAuditLogs);
  const filteredAuditLogs = useSupplementStore((s) => s.filteredAuditLogs);

  const [auditFilter, setAuditFilter] = useState<{
    userId?: string;
    module?: AuditModule;
    action?: AuditAction;
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const canViewAudit = currentRole === "super_admin" || currentRole === "hr_admin";
  const canViewLocks = currentRole === "super_admin" || currentRole === "hr_admin";

  // ── Filtered logs ──
  const displayLogs: AuditLog[] = canViewAudit ? filteredAuditLogs(auditFilter) : [];

  // ── Effects ──
  useEffect(() => {
    fetchAccounts();
    if (canViewAudit) fetchAuditLogs();
  }, [fetchAccounts, fetchAuditLogs, canViewAudit]);

  const handleAuditFilter = useCallback(
    (filter: {
      userId?: string;
      module?: AuditModule;
      action?: AuditAction;
      dateFrom?: string;
      dateTo?: string;
    }) => {
      setAuditFilter(filter);
    },
    []
  );

  return (
    <div>
      <BreadCrumb items={[{ label: "Tài khoản" }]} />
      <PageHeader
        title="Quản lý tài khoản"
        description={`${accounts.length} tài khoản hệ thống`}
        actions={
          canCreate ? (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Tạo tài khoản
            </Button>
          ) : undefined
        }
      />

      {loading && <TableSkeleton rows={6} columns={6} />}
      {!loading && error && (
        <ErrorMessage message={error} onRetry={fetchAccounts} />
      )}

      {!loading && !error && (
        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts">Danh sách tài khoản</TabsTrigger>
            {canViewAudit && (
              <TabsTrigger value="audit" className="gap-1.5">
                📜 Nhật Ký Thao Tác
              </TabsTrigger>
            )}
            {canViewLocks && (
              <TabsTrigger value="locks" className="gap-1.5">
                🔒 Khóa Dữ Liệu
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="accounts" className="mt-4">
            {accounts.length === 0 ? (
              <EmptyState
                title="Chưa có tài khoản nào"
                description="Tạo tài khoản để quản lý phân quyền hệ thống"
                actionLabel={canCreate ? "Tạo tài khoản" : undefined}
                onAction={canCreate ? () => setShowForm(true) : undefined}
              />
            ) : (
              <AccountTable onEdit={(account) => setEditingAccount(account)} />
            )}
          </TabsContent>

          {canViewAudit && (
            <TabsContent value="audit" className="mt-4 space-y-4">
              <AuditLogFilter onFilter={handleAuditFilter} />
              <div className="rounded-lg border border-slate-200 bg-white">
                <AuditLogTable logs={displayLogs} loading={auditLoading} />
              </div>
            </TabsContent>
          )}

          {canViewLocks && (
            <TabsContent value="locks" className="mt-4">
              <DataLockPanel />
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Create account dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo tài khoản mới</DialogTitle>
          </DialogHeader>
          <AccountForm onSuccess={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit account dialog */}
      <Dialog
        open={!!editingAccount}
        onOpenChange={(open) => {
          if (!open) setEditingAccount(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tài khoản</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <AccountForm
              initialData={editingAccount}
              onSuccess={() => setEditingAccount(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
