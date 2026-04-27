"use client";

// ============================================================================
// GK-HRMS — ContractPanel
// Tab Hợp đồng trong trang chi tiết nhân viên
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Plus,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContractStore } from "@/store/contractStore";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  CONTRACT_TYPE_CONFIG,
  CONTRACT_STATUS_CONFIG,
} from "@/types/contract";
import type { Contract, ContractStatus } from "@/types/contract";

interface ContractPanelProps {
  employeeId: string;
}

export function ContractPanel({ employeeId }: ContractPanelProps) {
  const canCreate = usePermission("employee", "create");
  const contracts = useContractStore((s) => s.contracts);
  const loading = useContractStore((s) => s.loading);
  const error = useContractStore((s) => s.error);
  const fetchContracts = useContractStore((s) => s.fetchContracts);

  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    fetchContracts().finally(() => setFetched(true));
  }, [fetchContracts]);

  const empContracts = useMemo(
    () =>
      contracts
        .filter((c) => c.employeeId === employeeId)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [contracts, employeeId]
  );

  if (!fetched || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-red-500 mb-2">{error}</p>
        <Button size="sm" variant="outline" onClick={() => fetchContracts()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            {empContracts.length} hợp đồng
          </span>
        </div>
        {canCreate && (
          <Button size="sm" className="gap-1.5" disabled>
            <Plus className="h-3.5 w-3.5" />
            Tạo hợp đồng
          </Button>
        )}
      </div>

      {empContracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Chưa có hợp đồng nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {empContracts.map((c) => {
            const typeConfig = CONTRACT_TYPE_CONFIG[c.type];
            const statusConfig = CONTRACT_STATUS_CONFIG[c.status as ContractStatus];
            const expiring = isExpiringSoon(c);
            return (
              <div
                key={c.id}
                className={`rounded-lg border p-4 transition-colors ${
                  expiring
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {typeConfig.label_vi}
                      </span>
                      <Badge className={`text-[10px] ${statusConfig.badgeColor}`}>
                        {statusConfig.label_vi}
                      </Badge>
                      {expiring && (
                        <Badge className="gap-1 border-amber-200 bg-amber-100 text-amber-700 text-[10px]">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Sắp hết hạn
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(c.startDate)} →{" "}
                      {c.endDate ? formatDate(c.endDate) : "Không thời hạn"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Lương cơ bản</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatCurrency(c.baseSalary)}
                    </p>
                    {c.allowances > 0 && (
                      <p className="text-xs text-slate-400">
                        + Phụ cấp {formatCurrency(c.allowances)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isExpiringSoon(c: Contract): boolean {
  if (c.status !== "active" || !c.endDate) return false;
  const diffMs = new Date(c.endDate).getTime() - Date.now();
  return diffMs > 0 && diffMs / (1000 * 60 * 60 * 24) <= 30;
}
