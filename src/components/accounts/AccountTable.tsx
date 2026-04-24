"use client";

// ============================================================================
// GK-HRMS — AccountTable
// Bảng danh sách tài khoản hệ thống
// ============================================================================

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, ShieldCheck, ShieldOff } from "lucide-react";
import { useAccountStore } from "@/store/accountStore";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, getInitials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { ROLE_CONFIG } from "@/types/account";
import type { UserRole } from "@/types/account";

export function AccountTable({ onEdit }: { onEdit?: (account: import("@/types/account").UserAccount) => void }) {
  const accounts = useAccountStore((s) => s.accounts);
  const toggleAccountStatus = useAccountStore((s) => s.toggleAccountStatus);
  const canUpdate = usePermission("account", "update");

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Tài khoản</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="hidden md:table-cell">Đăng nhập cuối</TableHead>
            {canUpdate && (
              <TableHead className="text-right">Thao tác</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const roleCfg = ROLE_CONFIG[account.role as UserRole];
            return (
              <TableRow key={account.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {getInitials(account.username)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {account.username}
                      </p>
                      <p className="text-xs text-slate-400">{account.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      roleCfg?.badgeColor ?? ""
                    }`}
                  >
                    {ROLE_LABELS[account.role as UserRole] ?? account.role}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      account.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        account.isActive ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {account.isActive ? "Hoạt động" : "Vô hiệu"}
                  </span>
                </TableCell>
                <TableCell className="hidden text-sm text-slate-500 md:table-cell">
                  {account.lastLoginAt
                    ? formatDate(account.lastLoginAt)
                    : "Chưa đăng nhập"}
                </TableCell>
                {canUpdate && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label="Sửa"
                        onClick={() => onEdit?.(account)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => toggleAccountStatus(account.id)}
                        aria-label={
                          account.isActive ? "Vô hiệu hóa" : "Kích hoạt"
                        }
                      >
                        {account.isActive ? (
                          <ShieldOff className="h-4 w-4 text-red-500" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
