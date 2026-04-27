"use client";

// ============================================================================
// GK-HRMS — AuditLogFilter
// Bộ lọc cho Nhật ký thao tác — đọc/ghi supplementStore trực tiếp
// ============================================================================

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAccountStore } from "@/store/accountStore";
import {
  AUDIT_ACTION_CONFIG,
  AUDIT_MODULE_CONFIG,
} from "@/types/supplement";
import type { AuditAction, AuditModule } from "@/types/supplement";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AuditLogFilterProps {
  onFilter: (filter: {
    userId?: string;
    module?: AuditModule;
    action?: AuditAction;
    dateFrom?: string;
    dateTo?: string;
  }) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditLogFilter({ onFilter }: AuditLogFilterProps) {
  const accounts = useAccountStore((s) => s.accounts);

  const [userId, setUserId] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const moduleEntries = Object.entries(AUDIT_MODULE_CONFIG) as [
    AuditModule,
    (typeof AUDIT_MODULE_CONFIG)[AuditModule],
  ][];
  const actionEntries = Object.entries(AUDIT_ACTION_CONFIG) as [
    AuditAction,
    (typeof AUDIT_ACTION_CONFIG)[AuditAction],
  ][];

  const applyFilter = () => {
    onFilter({
      userId: userId || undefined,
      module: (module as AuditModule) || undefined,
      action: (action as AuditAction) || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  const resetFilter = () => {
    setUserId("");
    setModule("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    onFilter({});
  };

  const hasFilter = userId || module || action || dateFrom || dateTo;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">Bộ lọc</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Người dùng */}
        <div>
          <label className="mb-1 block text-xs text-slate-500">Người dùng</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Tất cả</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.username}
              </option>
            ))}
          </select>
        </div>

        {/* Module */}
        <div>
          <label className="mb-1 block text-xs text-slate-500">Module</label>
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Tất cả</option>
            {moduleEntries.map(([value, config]) => (
              <option key={value} value={value}>
                {config.label_vi}
              </option>
            ))}
          </select>
        </div>

        {/* Hành động */}
        <div>
          <label className="mb-1 block text-xs text-slate-500">Hành động</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Tất cả</option>
            {actionEntries.map(([value, config]) => (
              <option key={value} value={value}>
                {config.label_vi}
              </option>
            ))}
          </select>
        </div>

        {/* Từ ngày */}
        <div>
          <label className="mb-1 block text-xs text-slate-500">Từ ngày</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-[34px] text-sm"
          />
        </div>

        {/* Đến ngày */}
        <div>
          <label className="mb-1 block text-xs text-slate-500">Đến ngày</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-[34px] text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-end gap-2">
          <Button size="sm" onClick={applyFilter} className="h-[34px]">
            Lọc
          </Button>
          {hasFilter && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetFilter}
              className="h-[34px] gap-1 text-slate-500"
            >
              <X className="h-3.5 w-3.5" />
              Xóa
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
