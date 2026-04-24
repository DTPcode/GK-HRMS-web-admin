"use client";

// ============================================================================
// GK-HRMS — Pagination
// Phân trang — hiển thị page numbers + prev/next + page size selector
// ============================================================================

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  /** Trang hiện tại (1-indexed) */
  currentPage: number;
  /** Tổng số trang */
  totalPages: number;
  /** Callback đổi trang */
  onPageChange: (page: number) => void;
  /** Tổng số bản ghi — hiển thị "Hiển thị x/y" */
  totalItems?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
}: PaginationProps) {
  // Tạo mảng page numbers hiển thị (max 5 page buttons)
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (currentPage >= totalPages - 2)
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];

    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      {/* Info */}
      <div className="text-sm text-slate-500">
        {totalItems !== undefined && (
          <span>Tổng: {totalItems} bản ghi</span>
        )}
      </div>

      {/* Page Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((page, idx) =>
          page === "..." ? (
            <span key={`dots-${idx}`} className="px-2 text-sm text-slate-400">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={cn("h-8 w-8 p-0 text-xs")}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
