"use client";

// ============================================================================
// GK-HRMS — EmployeeTable
// Bảng nhân viên thuần UI — nhận data + callbacks qua props
// CONSTRAINT: không gọi store — dễ test, tách biệt UI & logic
// ============================================================================

import { memo } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate, getInitials } from "@/lib/utils";
import { SalaryDisplay } from "@/components/shared/SalaryDisplay";
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_COLORS,
} from "@/lib/constants";
import type { Employee, EmployeeFilter } from "@/types/employee";
import type { Contract } from "@/types/contract";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EmployeeTableProps {
  employees: Employee[];
  /** Filter state — dùng để hiện sort icon */
  filter: EmployeeFilter;
  /** IDs đang được chọn — dùng cho checkbox */
  selectedIds: string[];
  /** Callback khi click "Xem chi tiết" */
  onView: (id: string) => void;
  /** Callback khi click "Sửa" */
  onEdit: (id: string) => void;
  /** Callback khi click "Xóa" */
  onDelete: (id: string) => void;
  /** Callback khi click sort header */
  onSort: (field: keyof Employee) => void;
  /** Callback toggle checkbox 1 row */
  onToggleSelect: (id: string) => void;
  /** Callback toggle chọn tất cả visible */
  onToggleSelectAll: () => void;
  /** Có quyền sửa? */
  canUpdate: boolean;
  /** Có quyền xóa? */
  canDelete: boolean;
  /** Có filter active (cho empty state message) */
  hasActiveFilter: boolean;
  /** Map employeeId → active Contract (nếu có) — dùng để hiển thị lương từ HĐ */
  activeContractMap?: Map<string, Contract>;
}

// ---------------------------------------------------------------------------
// Sort Icon Helper
// ---------------------------------------------------------------------------

function SortIcon({
  field,
  filter,
}: {
  field: string;
  filter: EmployeeFilter;
}) {
  if (filter.sortBy !== field) {
    return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-slate-300" />;
  }
  return filter.sortOrder === "desc" ? (
    <ArrowDown className="ml-1 inline h-3.5 w-3.5 text-blue-600" />
  ) : (
    <ArrowUp className="ml-1 inline h-3.5 w-3.5 text-blue-600" />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// React.memo: EmployeeTable là pure UI component nhận data + callbacks qua props.
// Khi EmployeePageClient re-render vì viewMode, deleteDialog… table không cần render lại.
// Đặc biệt hiệu quả khi danh sách nhân viên lớn (>100 items / SRS: 300 users).
export const EmployeeTable = memo(function EmployeeTable({
  employees,
  filter,
  selectedIds,
  onView,
  onEdit,
  onDelete,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  canUpdate,
  canDelete,
  hasActiveFilter,
  activeContractMap,
}: EmployeeTableProps) {
  // ── Empty state ──
  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">
          {hasActiveFilter
            ? "Không tìm thấy nhân viên nào phù hợp với bộ lọc."
            : "Chưa có nhân viên nào trong hệ thống."}
        </p>
      </div>
    );
  }

  // Checkbox "all" trong header: checked nếu tất cả visible đang chọn
  const allVisibleSelected =
    employees.length > 0 &&
    employees.every((e) => selectedIds.includes(e.id));
  const someSelected =
    employees.some((e) => selectedIds.includes(e.id)) && !allVisibleSelected;

  // Sortable header helper
  const sortableHeader = (label: string, field: keyof Employee) => (
    <button
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-0.5 text-left font-medium hover:text-slate-800"
    >
      {label}
      <SortIcon field={field} filter={filter} />
    </button>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 z-10 bg-white">
              {/* Checkbox all */}
              <TableHead className="hidden w-10 pl-4 md:table-cell">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  aria-label="Chọn tất cả"
                />
              </TableHead>
              <TableHead className="min-w-[220px]">
                {sortableHeader("Nhân viên", "name")}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {sortableHeader("Phòng ban", "department")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">Chi nhánh</TableHead>
              <TableHead className="hidden text-right md:table-cell">
                {sortableHeader("Lương (HĐ)", "salary")}
              </TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="hidden lg:table-cell">
                {sortableHeader("Ngày vào", "startDate")}
              </TableHead>
              <TableHead className="w-28 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => {
              const isSelected = selectedIds.includes(emp.id);
              return (
                <TableRow
                  key={emp.id}
                  className={cn(
                    "group transition-colors",
                    isSelected && "bg-blue-50/50"
                  )}
                >
                  {/* Checkbox */}
                  <TableCell className="hidden pl-4 md:table-cell">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(emp.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`Chọn ${emp.name}`}
                    />
                  </TableCell>

                  {/* Avatar + Tên + Email */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                        {emp.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={emp.avatarUrl}
                            alt={emp.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(emp.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">
                          {emp.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {emp.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Phòng ban */}
                  <TableCell className="hidden text-sm text-slate-600 md:table-cell">
                    {emp.department}
                  </TableCell>

                  {/* Chi nhánh */}
                  <TableCell className="hidden text-sm text-slate-600 lg:table-cell">
                    {emp.branchId}
                  </TableCell>

                  {/* Lương — từ contract active, không từ employee.salary */}
                  <TableCell className="hidden text-right text-sm font-medium md:table-cell">
                    {(() => {
                      const contract = activeContractMap?.get(emp.id);
                      if (!contract) {
                        return (
                          <span className="text-xs text-slate-400 italic">
                            Chưa có HĐ
                          </span>
                        );
                      }
                      return (
                        <span className="text-slate-800">
                          <SalaryDisplay salary={contract.baseSalary} />
                        </span>
                      );
                    })()}
                  </TableCell>

                  {/* Trạng thái */}
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        EMPLOYEE_STATUS_COLORS[emp.status] ?? ""
                      }`}
                    >
                      {EMPLOYEE_STATUS_LABELS[emp.status] ?? emp.status}
                    </span>
                  </TableCell>

                  {/* Ngày vào */}
                  <TableCell className="hidden text-sm text-slate-500 lg:table-cell">
                    {formatDate(emp.startDate)}
                  </TableCell>

                  {/* Actions — visible on hover */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(emp.id)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                        aria-label="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(emp.id)}
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
                          onClick={() => onDelete(emp.id)}
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
});
EmployeeTable.displayName = "EmployeeTable";
