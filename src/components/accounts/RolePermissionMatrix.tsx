"use client";

// ============================================================================
// GK-HRMS — RolePermissionMatrix
// Ma trận phân quyền: hiển thị quyền của từng role trên từng module
// ============================================================================

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { ROLE_PERMISSIONS, ROLE_LABELS } from "@/lib/constants";
import type { UserRole, Module, Action } from "@/types/account";

/** Danh sách modules hiển thị trong bảng — khớp Module enum */
const MODULES: Module[] = [
  "employees",
  "contracts",
  "attendance",
  "payroll",
  "accounts",
  "reports",
];

const MODULE_LABELS: Record<Module, string> = {
  employees: "Nhân viên",
  contracts: "Hợp đồng",
  attendance: "Chấm công",
  payroll: "Bảng lương",
  accounts: "Tài khoản",
  reports: "Báo cáo",
};

const ACTIONS: Action[] = ["view", "create", "update", "delete", "approve", "export"];

const ACTION_LABELS: Record<Action, string> = {
  view: "Xem",
  create: "Tạo",
  update: "Sửa",
  delete: "Xóa",
  approve: "Duyệt",
  export: "Xuất",
};

const ROLES: UserRole[] = ["super_admin", "hr_admin", "branch_manager", "accountant", "director"];

/** Check xem role có quyền action trên module không */
function hasPermission(
  role: UserRole,
  module: Module,
  action: Action
): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.some(
    (p) => p.module === module && (p.actions as readonly string[]).includes(action)
  );
}

export function RolePermissionMatrix() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">
        Ma trận phân quyền
      </h3>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Module</TableHead>
              <TableHead className="w-[80px]">Hành động</TableHead>
              {ROLES.map((role) => (
                <TableHead key={role} className="text-center">
                  {ROLE_LABELS[role]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODULES.flatMap((module) =>
              ACTIONS.map((action, actionIdx) => (
                <TableRow
                  key={`${module}-${action}`}
                  className={actionIdx === 0 ? "border-t-2 border-slate-200" : ""}
                >
                  {/* Module name — chỉ hiển thị ở row đầu tiên của mỗi module */}
                  <TableCell
                    className={
                      actionIdx === 0
                        ? "font-medium text-slate-800"
                        : "text-transparent"
                    }
                  >
                    {actionIdx === 0
                      ? MODULE_LABELS[module]
                      : MODULE_LABELS[module]}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {ACTION_LABELS[action]}
                  </TableCell>
                  {ROLES.map((role) => (
                    <TableCell key={role} className="text-center">
                      {hasPermission(role, module, action) ? (
                        <Check className="mx-auto h-4 w-4 text-emerald-500" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-slate-300" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
