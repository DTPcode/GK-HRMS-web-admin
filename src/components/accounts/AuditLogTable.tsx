"use client";

// ============================================================================
// GK-HRMS — AuditLogTable
// Bảng nhật ký thao tác — row color theo action, dialog xem changes
// Pagination 50/trang
// ============================================================================

import { useState, useMemo } from "react";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AUDIT_ACTION_CONFIG,
  AUDIT_MODULE_CONFIG,
} from "@/types/supplement";
import type { AuditLog } from "@/types/supplement";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDatetime = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
};

/** Row background color theo action */
const ROW_COLORS: Record<string, string> = {
  delete: "bg-red-50/60",
  reject: "bg-red-50/60",
  approve: "bg-emerald-50/50",
  create: "bg-emerald-50/50",
  login: "bg-slate-50/80",
  logout: "bg-slate-50/80",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AuditLogTableProps {
  logs: AuditLog[];
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditLogTable({ logs, loading }: AuditLogTableProps) {
  const [page, setPage] = useState(1);
  const [viewChanges, setViewChanges] = useState<AuditLog | null>(null);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const pagedLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return logs.slice(start, start + PAGE_SIZE);
  }, [logs, page]);

  if (loading) {
    return (
      <div className="space-y-2 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-slate-500">Chưa có log nào được ghi nhận</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">
                Thời gian
              </th>
              <th className="px-4 py-3 font-medium text-slate-500">Người dùng</th>
              <th className="px-4 py-3 font-medium text-slate-500">Hành động</th>
              <th className="px-4 py-3 font-medium text-slate-500">Module</th>
              <th className="px-4 py-3 font-medium text-slate-500">Đối tượng</th>
              <th className="px-4 py-3 font-medium text-slate-500">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {pagedLogs.map((log) => {
              const actionConfig = AUDIT_ACTION_CONFIG[log.action];
              const moduleConfig = AUDIT_MODULE_CONFIG[log.module];
              const rowColor = ROW_COLORS[log.action] ?? "";

              return (
                <tr
                  key={log.id}
                  className={cn(
                    "border-b border-slate-100 transition-colors hover:bg-slate-50",
                    rowColor
                  )}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {formatDatetime(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.userName}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "text-xs font-medium",
                        actionConfig.badgeColor
                      )}
                      variant="outline"
                    >
                      {actionConfig.label_vi}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {moduleConfig.label_vi}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-slate-700 font-medium">{log.targetName}</p>
                      <p className="text-xs text-slate-400">{log.targetId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {log.changes ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewChanges(log)}
                        className="h-7 gap-1 text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Xem
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">
            Trang {page}/{totalPages} · {logs.length} records
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Changes Detail Dialog */}
      <Dialog
        open={viewChanges !== null}
        onOpenChange={(open) => {
          if (!open) setViewChanges(null);
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Chi tiết thay đổi</DialogTitle>
          </DialogHeader>
          {viewChanges?.changes && (
            <div className="space-y-3">
              <div className="text-sm text-slate-500">
                <span className="font-medium">{viewChanges.userName}</span> đã{" "}
                {AUDIT_ACTION_CONFIG[viewChanges.action].label_vi.toLowerCase()}{" "}
                <span className="font-medium">{viewChanges.targetName}</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-2 text-left font-medium text-slate-500">
                        Trường
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-red-500">
                        Trước
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-emerald-600">
                        Sau
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(viewChanges.changes).map(
                      ([field, change]) => (
                        <tr
                          key={field}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-4 py-2 font-mono text-xs text-slate-700">
                            {field}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600">
                              {JSON.stringify(change.before, null, 2)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs">
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                              {JSON.stringify(change.after, null, 2)}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
