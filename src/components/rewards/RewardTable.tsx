"use client";

// ============================================================================
// GK-HRMS — RewardTable
// Bảng khen thưởng — hỗ trợ 2 modes:
//   1. Global (có prop employees) — hiện cột Nhân viên, PB, CN
//   2. Per-employee (không truyền employees) — ẩn cột nhân viên
// ============================================================================

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REWARD_TYPE_CONFIG } from "@/types/reward";
import { BRANCH_LIST } from "@/types/employee";
import type { RewardRecord } from "@/types/reward";
import type { Employee } from "@/types/employee";
import { getInitials } from "@/lib/utils";

const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const formatMonth = (m: string) => {
  const [y, mo] = m.split("-");
  return `${mo}/${y}`;
};

function getBranchShort(id: string) {
  return BRANCH_LIST.find((b) => b.id === id)?.name.replace("Gia Khánh - ", "") ?? id;
}

interface RewardTableProps {
  rewards: RewardRecord[];
  /** Pass employees for global mode — shows NV/PB/CN columns */
  employees?: Employee[];
  onEdit?: (reward: RewardRecord) => void;
  onDelete?: (id: string) => void;
  canModify?: boolean;
}

export function RewardTable({
  rewards,
  employees,
  onEdit,
  onDelete,
  canModify = false,
}: RewardTableProps) {
  const isGlobal = !!employees;
  const empMap = new Map<string, Employee>();
  employees?.forEach((e) => empMap.set(e.id, e));

  if (rewards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
        <p className="text-sm text-slate-500">Chưa có khen thưởng nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            {isGlobal && (
              <>
                <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
                  Nhân viên
                </th>
                <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
                  Phòng ban
                </th>
                <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
                  Chi nhánh
                </th>
              </>
            )}
            <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
              Hình thức
            </th>
            <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
              Tên danh hiệu
            </th>
            <th className="border-b px-3 py-2.5 text-right font-medium text-slate-600">
              Tiền thưởng
            </th>
            <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
              Ngày
            </th>
            <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
              Link lương
            </th>
            {canModify && (
              <th className="border-b px-3 py-2.5 text-center font-medium text-slate-600">
                Thao tác
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rewards.map((r) => {
            const cfg = REWARD_TYPE_CONFIG[r.type];
            const emp = empMap.get(r.employeeId);

            return (
              <tr
                key={r.id}
                className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
              >
                {isGlobal && (
                  <>
                    <td className="px-3 py-2.5">
                      {emp ? (
                        <Link
                          href={`/employees/${emp.id}`}
                          className="flex items-center gap-2 hover:text-blue-600"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                            {getInitials(emp.name)}
                          </div>
                          <span className="font-medium text-slate-800">
                            {emp.name}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">
                      {emp?.department ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">
                      {emp ? getBranchShort(emp.branchId) : "—"}
                    </td>
                  </>
                )}
                <td className="px-3 py-2.5">
                  <Badge
                    className={cn("text-xs", cfg.badgeColor)}
                    variant="outline"
                  >
                    {cfg.label_vi}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-800">
                  {r.title}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-600">
                  {r.amount > 0 ? formatVND(r.amount) : "—"}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {formatDate(r.effectiveDate)}
                </td>
                <td className="px-3 py-2.5">
                  {r.linkedPayrollMonth ? (
                    <Link href="/payroll">
                      <Badge
                        variant="outline"
                        className="cursor-pointer border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                      >
                        {formatMonth(r.linkedPayrollMonth)}
                      </Badge>
                    </Link>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                {canModify && (
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(r)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(r.id)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
