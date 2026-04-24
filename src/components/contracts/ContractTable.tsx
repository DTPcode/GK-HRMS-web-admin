"use client";

// ============================================================================
// GK-HRMS — ContractTable
// Bảng hợp đồng: columns, sort, expiry badges, row actions
// Dùng date-fns: differenceInDays, parseISO, format
// ============================================================================

import { differenceInDays, parseISO } from "date-fns";
import { Eye, Pencil, Trash2, RefreshCcw } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CONTRACT_STATUS_CONFIG,
  CONTRACT_TYPE_CONFIG,
} from "@/types/contract";
import type { Contract } from "@/types/contract";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContractTableProps {
  contracts: Contract[];
  /** Map employeeId → tên NV — để hiển thị tên thay vì ID */
  employeeMap: Map<string, string>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRenew: (contract: Contract) => void;
  canUpdate: boolean;
  canDelete: boolean;
}

// ---------------------------------------------------------------------------
// Expiry Badge Helper
// ---------------------------------------------------------------------------

function ExpiryBadge({ endDate }: { endDate: string | null | undefined }) {
  if (!endDate) return <span className="text-sm text-slate-400">—</span>;

  const daysLeft = differenceInDays(parseISO(endDate), new Date());

  if (daysLeft < 0) {
    return (
      <div>
        <span className="text-sm text-slate-700">{formatDate(endDate)}</span>
        <span className="ml-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          Đã hết hạn
        </span>
      </div>
    );
  }

  if (daysLeft <= 30) {
    return (
      <div>
        <span className="text-sm text-slate-700">{formatDate(endDate)}</span>
        <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          Còn {daysLeft} ngày
        </span>
      </div>
    );
  }

  return <span className="text-sm text-slate-700">{formatDate(endDate)}</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractTable({
  contracts,
  employeeMap,
  onEdit,
  onDelete,
  onRenew,
  canUpdate,
  canDelete,
}: ContractTableProps) {
  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">
          Không tìm thấy hợp đồng nào phù hợp.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Nhân viên</TableHead>
              <TableHead>Loại HĐ</TableHead>
              <TableHead className="hidden md:table-cell">Ngày bắt đầu</TableHead>
              <TableHead className="hidden min-w-[200px] md:table-cell">Ngày kết thúc</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Lương cơ bản</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Phụ cấp</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-28 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((c) => {
              const empName = employeeMap.get(c.employeeId) ?? c.employeeId;
              const statusCfg = CONTRACT_STATUS_CONFIG[c.status];
              const typeCfg = CONTRACT_TYPE_CONFIG[c.type];

              return (
                <TableRow key={c.id} className="group transition-colors">
                  {/* Nhân viên — link đến /employees/[id] */}
                  <TableCell>
                    <Link
                      href={`/employees/${c.employeeId}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {empName}
                    </Link>
                  </TableCell>

                  {/* Loại HĐ */}
                  <TableCell>
                    <span className="text-sm text-slate-700">
                      {typeCfg.label_vi}
                    </span>
                  </TableCell>

                  {/* Ngày bắt đầu */}
                  <TableCell className="hidden text-sm text-slate-600 md:table-cell">
                    {formatDate(c.startDate)}
                  </TableCell>

                  {/* Ngày kết thúc + badge hết hạn */}
                  <TableCell className="hidden md:table-cell">
                    <ExpiryBadge endDate={c.endDate} />
                  </TableCell>

                  {/* Lương cơ bản */}
                  <TableCell className="hidden text-right text-sm font-medium text-slate-800 lg:table-cell">
                    {formatCurrency(c.baseSalary)}
                  </TableCell>

                  {/* Phụ cấp */}
                  <TableCell className="hidden text-right text-sm text-slate-600 lg:table-cell">
                    {formatCurrency(c.allowances)}
                  </TableCell>

                  {/* Trạng thái */}
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusCfg.badgeColor}`}
                    >
                      {statusCfg.label_vi}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {/* Gia hạn — chỉ hiện cho HĐ active */}
                      {canUpdate && c.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRenew(c)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600"
                          aria-label="Gia hạn"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(c.id)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-amber-600"
                          aria-label="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(c.id)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                          aria-label="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
