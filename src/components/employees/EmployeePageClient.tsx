"use client";

// ============================================================================
// GK-HRMS — EmployeePageClient (Orchestrator)
// Trang danh sách nhân viên: filter + table/grid + pagination + delete dialog
// Orchestrator — wire store ↔ pure UI components
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { Plus, LayoutGrid, List, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { EmployeeFilter } from "@/components/employees/EmployeeFilter";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { EmployeeGrid } from "@/components/employees/EmployeeGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useEmployeeStore } from "@/store/employeeStore";
import { useContractStore } from "@/store/contractStore";
import { usePermission } from "@/hooks/usePermission";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "table" | "grid";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmployeePageClient() {
  const router = useRouter();

  // ── Local state ──
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // ── Store (individual selectors → chỉ re-render khi slice thay đổi) ──
  const employees = useEmployeeStore((s) => s.employees);
  const loading = useEmployeeStore((s) => s.loading);
  const error = useEmployeeStore((s) => s.error);
  const filter = useEmployeeStore((s) => s.filter);
  const selectedIds = useEmployeeStore((s) => s.selectedIds);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const deleteEmployee = useEmployeeStore((s) => s.deleteEmployee);
  const setFilter = useEmployeeStore((s) => s.setFilter);
  const paginatedEmployees = useEmployeeStore((s) => s.paginatedEmployees);
  const totalFiltered = useEmployeeStore((s) => s.totalFiltered);
  const toggleSelectId = useEmployeeStore((s) => s.toggleSelectId);
  const clearSelection = useEmployeeStore((s) => s.clearSelection);

  // ── Permissions ──
  const canCreate = usePermission("employee", "create");
  const canUpdate = usePermission("employee", "update");
  const canDelete = usePermission("employee", "delete");

  // ── Contract store (for salary display) ──
  const contracts = useContractStore((s) => s.contracts);
  const fetchContracts = useContractStore((s) => s.fetchContracts);

  // ── Fetch 1 lần khi mount ──
  useEffect(() => {
    fetchEmployees();
    fetchContracts();
  }, [fetchEmployees, fetchContracts]);

  // ── Map employeeId → active Contract (lấy lương từ HĐ) ──
  const activeContractMap = useMemo(() => {
    const map = new Map<string, (typeof contracts)[number]>();
    for (const c of contracts) {
      if (c.status === "active") {
        map.set(c.employeeId, c);
      }
    }
    return map;
  }, [contracts]);

  // ── Derived ──
  const total = totalFiltered();
  const pageData = paginatedEmployees();
  const totalPages = Math.ceil(total / filter.pageSize);
  const hasActiveFilter = !!(
    filter.search ||
    filter.departmentId ||
    filter.branchId ||
    filter.status
  );

  // ── Handlers ──
  const handleView = (id: string) => router.push(`/employees/${id}`);
  const handleEdit = (id: string) => router.push(`/employees/${id}/edit`);
  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteEmployee(deleteTargetId);
      toast.success("Đã xóa nhân viên");
    } catch {
      toast.error("Không thể xóa nhân viên. Vui lòng thử lại.");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedIds.map((id) => deleteEmployee(id)));
      toast.success(`Đã xóa ${selectedIds.length} nhân viên`);
    } catch {
      toast.error("Có lỗi khi xóa nhân viên. Vui lòng thử lại.");
    } finally {
      clearSelection();
    }
  };

  const handleSort = (field: string) => {
    const isSameField = filter.sortBy === field;
    const newOrder =
      isSameField && filter.sortOrder === "asc" ? "desc" : "asc";
    setFilter({
      sortBy: field as typeof filter.sortBy,
      sortOrder: newOrder,
    });
  };

  const handleToggleSelectAll = () => {
    const allSelected = pageData.every((e) => selectedIds.includes(e.id));
    if (allSelected) {
      // Bỏ chọn tất cả visible
      for (const e of pageData) {
        if (selectedIds.includes(e.id)) toggleSelectId(e.id);
      }
    } else {
      // Chọn tất cả visible
      for (const e of pageData) {
        if (!selectedIds.includes(e.id)) toggleSelectId(e.id);
      }
    }
  };

  return (
    <div>
      {/* ── BreadCrumb ── */}
      <BreadCrumb items={[{ label: "Nhân viên" }]} />

      {/* ── Page Header ── */}
      <PageHeader
        title="Quản lý nhân viên"
        description={`Tổng cộng ${employees.length} nhân viên`}
        actions={
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-l-lg p-2 transition-colors ${
                  viewMode === "table"
                    ? "bg-slate-100 text-slate-700"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                aria-label="Xem dạng bảng"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-r-lg p-2 transition-colors ${
                  viewMode === "grid"
                    ? "bg-slate-100 text-slate-700"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                aria-label="Xem dạng lưới"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {canCreate && (
              <Button
                onClick={() => router.push("/employees/new")}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Thêm nhân viên
              </Button>
            )}
          </div>
        }
      />

      {/* ── Filter ── */}
      <EmployeeFilter />

      {/* ── Toolbar: result count + bulk actions ── */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {total} kết quả
          {hasActiveFilter && " (đã lọc)"}
        </p>

        {selectedIds.length > 0 && canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa {selectedIds.length} nhân viên
          </Button>
        )}
      </div>

      {/* ── Content ── */}
      {loading && <TableSkeleton rows={10} columns={9} />}

      {!loading && error && (
        <ErrorMessage message={error} onRetry={fetchEmployees} />
      )}

      {!loading && !error && employees.length === 0 && !hasActiveFilter && (
        <EmptyState
          title="Chưa có nhân viên nào"
          description="Bắt đầu bằng việc thêm nhân viên đầu tiên"
          actionLabel={canCreate ? "Thêm nhân viên" : undefined}
          onAction={
            canCreate ? () => router.push("/employees/new") : undefined
          }
        />
      )}

      {!loading && !error && (employees.length > 0 || hasActiveFilter) && (
        <>
          {viewMode === "table" ? (
            <EmployeeTable
              employees={pageData}
              filter={filter}
              selectedIds={selectedIds}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteTargetId(id)}
              onSort={handleSort}
              onToggleSelect={toggleSelectId}
              onToggleSelectAll={handleToggleSelectAll}
              canUpdate={canUpdate}
              canDelete={canDelete}
              hasActiveFilter={hasActiveFilter}
              activeContractMap={activeContractMap}
            />
          ) : (
            <EmployeeGrid />
          )}

          {/* ── Pagination ── */}
          <Pagination
            currentPage={filter.page}
            totalPages={totalPages}
            onPageChange={(p) => setFilter({ page: p })}
            totalItems={total}
          />
        </>
      )}

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        title="Xóa nhân viên?"
        description="Bạn có chắc muốn xóa nhân viên này không? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
