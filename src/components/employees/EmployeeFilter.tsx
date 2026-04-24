"use client";

// ============================================================================
// GK-HRMS — EmployeeFilter
// Thanh lọc: search (debounce 300ms), department, branch, status
// Đọc/ghi employeeStore trực tiếp — không nhận props
// ============================================================================

import { useEffect, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployeeStore } from "@/store/employeeStore";
import { useDebounce } from "@/hooks/useDebounce";
import {
  DEPARTMENT_LIST,
  BRANCH_LIST,
  STATUS_CONFIG,
} from "@/types/employee";

export function EmployeeFilter() {
  const { filter, setFilter, resetFilter } = useEmployeeStore();
  const [searchInput, setSearchInput] = useState(filter.search ?? "");

  // ── Debounce search — 300ms, dùng useDebounce hook cho nhất quán ──
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    setFilter({ search: debouncedSearch });
  }, [debouncedSearch, setFilter]);

  // ── Đếm số filter đang active (trừ search empty) ──
  const activeFilterCount = [
    filter.departmentId,
    filter.branchId,
    filter.status,
  ].filter(Boolean).length;

  const hasAnyFilter = activeFilterCount > 0 || (filter.search ?? "").length > 0;

  const handleReset = () => {
    resetFilter();
    setSearchInput("");
  };

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* ── Search Input ── */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="employee-search"
            placeholder="Tìm theo tên, email, SĐT..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Xóa tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── Department Select ── */}
        <Select
          value={(filter.departmentId ?? "all") as string}
          onValueChange={(v) =>
            setFilter({ departmentId: v === "all" || !v ? undefined : v })
          }
        >
          <SelectTrigger id="filter-department" className="w-44">
            <SelectValue placeholder="Phòng ban" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phòng ban</SelectItem>
            {DEPARTMENT_LIST.map((dept) => (
              <SelectItem key={dept.id} value={dept.name}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ── Branch Select ── */}
        <Select
          value={(filter.branchId ?? "all") as string}
          onValueChange={(v) =>
            setFilter({ branchId: v === "all" || !v ? undefined : v })
          }
        >
          <SelectTrigger id="filter-branch" className="w-52">
            <SelectValue placeholder="Chi nhánh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả chi nhánh</SelectItem>
            {BRANCH_LIST.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ── Status Select ── */}
        <Select
          value={filter.status ?? "all"}
          onValueChange={(v) =>
            setFilter({
              status: v === "all" ? undefined : (v as typeof filter.status),
            })
          }
        >
          <SelectTrigger id="filter-status" className="w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label_vi}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>



        {/* ── Active Filter Badge + Reset ── */}
        {activeFilterCount > 0 && (
          <Badge
            variant="secondary"
            className="gap-1 bg-blue-50 text-blue-700"
          >
            <SlidersHorizontal className="h-3 w-3" />
            {activeFilterCount} bộ lọc
          </Badge>
        )}

        {hasAnyFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1 text-slate-500 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
            Xóa bộ lọc
          </Button>
        )}
      </div>
    </div>
  );
}
