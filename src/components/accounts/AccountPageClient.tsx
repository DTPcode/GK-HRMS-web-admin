"use client";

// ============================================================================
// GK-HRMS — AccountPageClient
// Trang quản lý tài khoản: danh sách + tạo/sửa
// ============================================================================

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { AccountTable } from "@/components/accounts/AccountTable";
import { AccountForm } from "@/components/accounts/AccountForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { useAccountStore } from "@/store/accountStore";
import { usePermission } from "@/hooks/usePermission";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AccountPageClient() {
  // ── Store (individual selectors → chỉ re-render khi slice thay đổi) ──
  const accounts = useAccountStore((s) => s.accounts);
  const loading = useAccountStore((s) => s.loading);
  const error = useAccountStore((s) => s.error);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const canCreate = usePermission("account", "create");
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<import("@/types/account").UserAccount | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

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
      {!loading && !error && accounts.length === 0 && (
        <EmptyState
          title="Chưa có tài khoản nào"
          description="Tạo tài khoản để quản lý phân quyền hệ thống"
          actionLabel={canCreate ? "Tạo tài khoản" : undefined}
          onAction={canCreate ? () => setShowForm(true) : undefined}
        />
      )}
      {!loading && !error && accounts.length > 0 && (
        <AccountTable onEdit={(account) => setEditingAccount(account)} />
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
