"use client";

// ============================================================================
// GK-HRMS — DisciplineTable
// Bảng kỷ luật — dual mode: global (hiện NV columns) / per-employee
// Row đỏ nhạt nếu type='dismiss'
// ============================================================================

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DISCIPLINE_TYPE_CONFIG,
  DISCIPLINE_STATUS_CONFIG,
} from "@/types/reward";
import { BRANCH_LIST } from "@/types/employee";
import type { DisciplineRecord } from "@/types/reward";
import type { Employee } from "@/types/employee";
import { getInitials } from "@/lib/utils";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

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

interface DisciplineTableProps {
  disciplines: DisciplineRecord[];
  employees?: Employee[];
  onEdit?: (disc: DisciplineRecord) => void;
  onDelete?: (id: string) => void;
  canModify?: boolean;
}

export function DisciplineTable({
  disciplines,
  employees,
  onEdit,
  onDelete,
  canModify = false,
}: DisciplineTableProps) {
  const isGlobal = !!employees;
  const empMap = new Map<string, Employee>();
  employees?.forEach((e) => empMap.set(e.id, e));

  if (disciplines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
        <p className="text-sm text-slate-500">Chưa có kỷ luật nào</p>
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
              Nội dung
            </th>
            <th className="border-b px-3 py-2.5 text-right font-medium text-slate-600">
              Tiền phạt
            </th>
            <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
              Từ ngày
            </th>
            <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
              Đến ngày
            </th>
            <th className="border-b px-3 py-2.5 text-center font-medium text-slate-600">
              Trạng thái
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
          {disciplines.map((d) => {
            const typeCfg = DISCIPLINE_TYPE_CONFIG[d.type];
            const statusCfg = DISCIPLINE_STATUS_CONFIG[d.status];
            const emp = empMap.get(d.employeeId);
            const isDismiss = d.type === "dismiss";

            return (
              <tr
                key={d.id}
                className={cn(
                  "border-b border-slate-100 transition-colors",
                  isDismiss
                    ? "bg-red-50/40 hover:bg-red-50"
                    : "hover:bg-slate-50/50"
                )}
              >
                {isGlobal && (
                  <>
                    <td className="px-3 py-2.5">
                      {emp ? (
                        <Link
                          href={`/employees/${emp.id}`}
                          className="flex items-center gap-2 hover:text-blue-600"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700">
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
                    className={cn("text-xs", typeCfg.badgeColor)}
                    variant="outline"
                  >
                    {typeCfg.label_vi}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 max-w-[200px] truncate font-medium text-slate-800">
                  {d.title}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-red-600">
                  {d.penaltyAmount > 0 ? formatVND(d.penaltyAmount) : "—"}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {formatDate(d.effectiveDate)}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {d.endDate ? formatDate(d.endDate) : "—"}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Badge className={cn("text-[10px]", statusCfg.badgeColor)}>
                    {statusCfg.label_vi}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  {d.linkedPayrollMonth ? (
                    <Link href="/payroll">
                      <Badge
                        variant="outline"
                        className="cursor-pointer border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                      >
                        {formatMonth(d.linkedPayrollMonth)}
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
                          onClick={() => onEdit(d)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(d.id)}
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
