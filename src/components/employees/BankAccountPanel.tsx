"use client";

// ============================================================================
// GK-HRMS — BankAccountPanel
// Quản lý tài khoản ngân hàng của nhân viên — đọc/ghi employeeStore
// RBAC: View: hr_admin, super_admin, accountant
//       Create/Update/Delete: hr_admin, super_admin
// ============================================================================

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Star,
  CreditCard,
  Building2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useEmployeeStore } from "@/store/employeeStore";
import { usePermission } from "@/hooks/usePermission";
import type { BankAccount } from "@/types/employee";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mask số TK: chỉ hiện 4 số cuối — VD: ****1234 */
const maskAccountNumber = (num: string) => {
  if (num.length <= 4) return num;
  return "•".repeat(num.length - 4) + num.slice(-4);
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BankAccountPanelProps {
  employeeId: string;
  employeeName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BankAccountPanel({
  employeeId,
  employeeName,
}: BankAccountPanelProps) {
  const canCreate = usePermission("employee", "create");
  const bankAccounts = useEmployeeStore((s) => s.bankAccounts);
  const fetchBankAccounts = useEmployeeStore((s) => s.fetchBankAccounts);
  const addBankAccount = useEmployeeStore((s) => s.addBankAccount);
  const deleteBankAccount = useEmployeeStore((s) => s.deleteBankAccount);
  const setPrimaryAccount = useEmployeeStore((s) => s.setPrimaryAccount);
  const storeError = useEmployeeStore((s) => s.error);

  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);

  // Form state
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [branch, setBranch] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Accounts for this employee only
  const accounts = bankAccounts.filter((a) => a.employeeId === employeeId);

  // ── Fetch ──
  useEffect(() => {
    setLoading(true);
    fetchBankAccounts(employeeId).finally(() => setLoading(false));
  }, [employeeId, fetchBankAccounts]);

  // Show store errors as toast
  useEffect(() => {
    if (storeError && storeError.includes("tài khoản")) {
      toast.error(storeError);
    }
  }, [storeError]);

  // ── Reset form ──
  const resetForm = () => {
    setBankName("");
    setAccountNumber("");
    setAccountHolder("");
    setBranch("");
    setIsPrimary(false);
    setFormErrors({});
    setShowDialog(false);
  };

  const openCreateDialog = () => {
    // Pre-fill accountHolder with employee name
    setAccountHolder(employeeName.toUpperCase());
    setIsPrimary(accounts.length === 0);
    setShowDialog(true);
  };

  // ── Validate ──
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!bankName.trim()) errors.bankName = "Vui lòng nhập tên ngân hàng";
    if (!/^[0-9]{9,19}$/.test(accountNumber))
      errors.accountNumber = "Số tài khoản 9-19 chữ số";
    if (!accountHolder.trim() || accountHolder.trim().length < 2)
      errors.accountHolder = "Vui lòng nhập tên chủ tài khoản";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Create ──
  const handleCreate = async () => {
    if (!validate()) return;

    setFormLoading(true);
    try {
      await addBankAccount({
        employeeId,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
        branch: branch.trim() || undefined,
        isPrimary: accounts.length === 0 ? true : isPrimary,
      });
      toast.success("Đã thêm tài khoản ngân hàng");
      resetForm();
    } catch {
      toast.error("Không thể thêm tài khoản. Vui lòng thử lại.");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Set Primary ──
  const handleSetPrimary = async (id: string) => {
    try {
      await setPrimaryAccount(id);
      toast.success("Đã đặt làm tài khoản nhận lương");
    } catch {
      toast.error("Không thể cập nhật. Vui lòng thử lại.");
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBankAccount(deleteTarget.id);
      toast.success("Đã xóa tài khoản ngân hàng");
      setDeleteTarget(null);
    } catch {
      toast.error("Không thể xóa tài khoản. Vui lòng thử lại.");
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            {accounts.length} tài khoản ngân hàng
          </span>
        </div>
        {canCreate && (
          <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Thêm tài khoản
          </Button>
        )}
      </div>

      {/* Account List */}
      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <CreditCard className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            Chưa có tài khoản ngân hàng nào
          </p>
          {canCreate && (
            <Button
              size="sm"
              variant="outline"
              onClick={openCreateDialog}
              className="mt-3 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm tài khoản
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                acc.isPrimary
                  ? "border-blue-200 bg-blue-50/40"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Bank icon */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    acc.isPrimary
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {acc.bankName}
                    </span>
                    {acc.isPrimary && (
                      <Badge className="gap-1 border-blue-200 bg-blue-100 text-blue-700 text-[10px]">
                        <Star className="h-2.5 w-2.5" />
                        Nhận lương
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-sm text-slate-600">
                    {maskAccountNumber(acc.accountNumber)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {acc.accountHolder}
                    {acc.branch ? ` · ${acc.branch}` : ""}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {canCreate && (
                <div className="flex items-center gap-1">
                  {!acc.isPrimary && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSetPrimary(acc.id)}
                      className="h-8 gap-1 text-xs text-blue-600 hover:bg-blue-50"
                    >
                      <Star className="h-3 w-3" />
                      Đặt mặc định
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(acc)}
                    className="h-8 w-8 p-0 text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm tài khoản ngân hàng</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Bank name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Ngân hàng <span className="text-red-500">*</span>
              </label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="VD: Vietcombank, BIDV, Techcombank"
                className="text-sm"
              />
              {formErrors.bankName && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.bankName}
                </p>
              )}
            </div>

            {/* Account number */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Số tài khoản <span className="text-red-500">*</span>
              </label>
              <Input
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(e.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                placeholder="9-19 chữ số"
                className="font-mono text-sm"
                maxLength={19}
              />
              {formErrors.accountNumber && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.accountNumber}
                </p>
              )}
            </div>

            {/* Account holder */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tên chủ tài khoản <span className="text-red-500">*</span>
              </label>
              <Input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="NGUYEN VAN A"
                className="text-sm uppercase"
              />
              {formErrors.accountHolder && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.accountHolder}
                </p>
              )}
            </div>

            {/* Branch */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Chi nhánh ngân hàng
              </label>
              <Input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Chi nhánh ngân hàng (tùy chọn)"
                className="text-sm"
              />
            </div>

            {/* isPrimary checkbox */}
            {accounts.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-slate-600 pt-1">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Đặt làm tài khoản nhận lương chính
              </label>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              disabled={formLoading}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={formLoading}
              className="gap-1.5"
            >
              {formLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa tài khoản ngân hàng"
        description={`Bạn có chắc muốn xóa TK ${maskAccountNumber(deleteTarget?.accountNumber ?? "")} tại ${deleteTarget?.bankName ?? ""}?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
