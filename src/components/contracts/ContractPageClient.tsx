"use client";

// ============================================================================
// GK-HRMS — ContractPageClient (Orchestrator)
// Trang hợp đồng: filter tabs + table + renew dialog + delete confirm
// Dùng date-fns: differenceInDays, parseISO
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { BreadCrumb } from "@/components/layout/BreadCrumb";
import { ContractTable } from "@/components/contracts/ContractTable";
import { RenewContractDialog } from "@/components/contracts/RenewContractDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useContractStore } from "@/store/contractStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { usePermission } from "@/hooks/usePermission";
import type { Contract } from "@/types/contract";

// ---------------------------------------------------------------------------
// Filter tab type
// ---------------------------------------------------------------------------

type FilterTab = "all" | "active" | "expiring" | "expired";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractPageClient() {
  const router = useRouter();

  // ── Store (individual selectors → chỉ re-render khi slice thay đổi) ──
  const contracts = useContractStore((s) => s.contracts);
  const loading = useContractStore((s) => s.loading);
  const error = useContractStore((s) => s.error);
  const fetchContracts = useContractStore((s) => s.fetchContracts);
  const deleteContract = useContractStore((s) => s.deleteContract);
  const expiringContracts = useContractStore((s) => s.expiringContracts);
  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);

  // ── Local state ──
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [renewTarget, setRenewTarget] = useState<Contract | null>(null);

  // ── Permissions ──
  const canCreate = usePermission("contract", "create");
  const canUpdate = usePermission("contract", "update");
  const canDelete = usePermission("contract", "delete");

  // ── Fetch on mount ──
  useEffect(() => {
    fetchContracts();
    if (employees.length === 0) fetchEmployees();
  }, [fetchContracts, fetchEmployees, employees.length]);

  // ── Employee ID → Name map ──
  const employeeMap = useMemo(() => {
    return new Map(employees.map((e) => [e.id, e.name]));
  }, [employees]);

  // ── Filter by tab ──
  const filteredContracts = useMemo(() => {
    const now = new Date();
    switch (activeTab) {
      case "active":
        return contracts.filter((c) => c.status === "active");
      case "expiring":
        return contracts.filter((c) => {
          if (c.status !== "active" || !c.endDate) return false;
          const daysLeft = differenceInDays(parseISO(c.endDate), now);
          return daysLeft >= 0 && daysLeft <= 30;
        });
      case "expired":
        return contracts.filter((c) => {
          if (c.status === "expired") return true;
          // Also include active contracts past endDate
          if (c.endDate) {
            const daysLeft = differenceInDays(parseISO(c.endDate), now);
            return daysLeft < 0;
          }
          return false;
        });
      default:
        return contracts;
    }
  }, [contracts, activeTab]);

  // ── Counts for tab badges ──
  const counts = useMemo(() => {
    const now = new Date();
    const activeContracts = contracts.filter((c) => c.status === "active");
    const expiring = expiringContracts();
    const expiredContracts = contracts.filter((c) => {
      if (c.status === "expired") return true;
      if (c.endDate) {
        return differenceInDays(parseISO(c.endDate), now) < 0;
      }
      return false;
    });

    return {
      all: contracts.length,
      active: activeContracts.length,
      expiring: expiring.length,
      expired: expiredContracts.length,
    };
  }, [contracts, expiringContracts]);

  // ── Handlers ──
  const handleEdit = (id: string) => {
    // Navigate to edit page or open dialog (using route for now)
    router.push(`/contracts/new?edit=${id}`);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteContract(deleteTargetId);
      toast.success("Đã xóa hợp đồng");
    } catch {
      toast.error("Không thể xóa hợp đồng. Vui lòng thử lại.");
    } finally {
      setDeleteTargetId(null);
    }
  };

  return (
    <div>
      <BreadCrumb items={[{ label: "Hợp đồng" }]} />

      <PageHeader
        title="Quản lý hợp đồng"
        description={`${contracts.length} hợp đồng · ${counts.expiring} sắp hết hạn`}
        actions={
          canCreate ? (
            <Button
              onClick={() => router.push("/contracts/new")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Tạo hợp đồng
            </Button>
          ) : undefined
        }
      />

      {/* ── Filter Tabs ── */}
      <div className="mb-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
        >
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              Tất cả
              <span className="rounded-full bg-slate-200 px-1.5 text-xs">
                {counts.all}
              </span>
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-1.5">
              Đang hiệu lực
              <span className="rounded-full bg-emerald-100 px-1.5 text-xs text-emerald-700">
                {counts.active}
              </span>
            </TabsTrigger>
            <TabsTrigger value="expiring" className="gap-1.5">
              Sắp hết hạn
              {counts.expiring > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">
                  {counts.expiring}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-1.5">
              Đã hết hạn
              {counts.expired > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 text-xs text-red-700">
                  {counts.expired}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Content ── */}
      {loading && <TableSkeleton rows={8} columns={8} />}

      {!loading && error && (
        <ErrorMessage message={error} onRetry={fetchContracts} />
      )}

      {!loading && !error && filteredContracts.length === 0 && (
        <EmptyState
          title="Không có hợp đồng nào"
          description={
            activeTab === "all"
              ? "Bắt đầu bằng việc tạo hợp đồng đầu tiên"
              : `Không có hợp đồng nào ở trạng thái "${activeTab === "active" ? "đang hiệu lực" : activeTab === "expiring" ? "sắp hết hạn" : "đã hết hạn"}"`
          }
          actionLabel={activeTab === "all" && canCreate ? "Tạo hợp đồng" : undefined}
          onAction={activeTab === "all" && canCreate ? () => router.push("/contracts/new") : undefined}
        />
      )}

      {!loading && !error && filteredContracts.length > 0 && (
        <ContractTable
          contracts={filteredContracts}
          employeeMap={employeeMap}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteTargetId(id)}
          onRenew={(contract) => setRenewTarget(contract)}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      )}

      {/* ── Renew Contract Dialog ── */}
      {renewTarget && (
        <RenewContractDialog
          open={!!renewTarget}
          onOpenChange={(open) => {
            if (!open) setRenewTarget(null);
          }}
          contract={renewTarget}
        />
      )}

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        title="Xóa hợp đồng?"
        description="Bạn có chắc muốn xóa hợp đồng này không? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
