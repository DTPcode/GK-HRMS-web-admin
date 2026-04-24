"use client";

// ============================================================================
// GK-HRMS — DataExportButton (Shared)
// Export data sang CSV — dùng cho kế toán đối soát (theo SRS)
// ============================================================================

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataExportButtonProps {
  /** Label hiển thị trên nút */
  label?: string;
  /** Dữ liệu cần export — mảng objects */
  data: Record<string, unknown>[];
  /** Tên file (không có extension) */
  filename: string;
  /** Định dạng — CSV hoạt động, Excel cần thêm thư viện */
  format?: "csv" | "excel";
  /** Disable khi không có data */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataExportButton({
  label = "Xuất CSV",
  data,
  filename,
  format = "csv",
  disabled = false,
}: DataExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;

    if (format === "excel") {
      // TODO: Cần thêm thư viện "xlsx" khi backend sẵn sàng
      // import * as XLSX from 'xlsx';
      // const ws = XLSX.utils.json_to_sheet(data);
      // const wb = XLSX.utils.book_new();
      // XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      // XLSX.writeFile(wb, `${filename}.xlsx`);
      alert(
        "Chức năng xuất Excel sẽ được cập nhật khi backend sẵn sàng. Hiện tại vui lòng dùng CSV."
      );
      return;
    }

    // ── CSV export ──
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");
    const csvRows = data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          // Escape CSV value: nếu có dấu phẩy hoặc xuống dòng → bọc ""
          const str = String(val ?? "");
          return str.includes(",") || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    );

    // BOM UTF-8 cho Excel mở đúng tiếng Việt
    const csv = "\uFEFF" + [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className="gap-1.5"
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
