"use client";

// ============================================================================
// GK-HRMS — EmployeeInsurancePanel
// Panel bảo hiểm cho 1 NV cụ thể (dùng trong /employees/[id]/insurance)
// ============================================================================

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { InsuranceDetail } from "@/components/insurance/InsuranceDetail";
import { InsuranceForm } from "@/components/insurance/InsuranceForm";
import { InsuranceSummaryCard } from "@/components/insurance/InsuranceSummaryCard";
import { useInsuranceStore } from "@/store/insuranceStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { useAccountStore } from "@/store/accountStore";
import { INSURANCE_RATE_CONFIG } from "@/types/insurance";
import type { InsuranceRecord, InsuranceFormData } from "@/types/insurance";

interface Props {
  employeeId: string;
}

export function EmployeeInsurancePanel({ employeeId }: Props) {
  const records = useInsuranceStore((s) => s.records);
  const loading = useInsuranceStore((s) => s.loading);
  const fetchInsurance = useInsuranceStore((s) => s.fetchInsurance);
  const createInsurance = useInsuranceStore((s) => s.createInsurance);
  const updateInsurance = useInsuranceStore((s) => s.updateInsurance);
  const suspendInsurance = useInsuranceStore((s) => s.suspendInsurance);
  const terminateInsurance = useInsuranceStore((s) => s.terminateInsurance);

  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const currentRole = useAccountStore((s) => s.currentUser.role);

  const [mounted, setMounted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);

  const employee = employees.find((e) => e.id === employeeId);
  const record = records.find(
    (r) => r.employeeId === employeeId && r.status !== "terminated"
  );
  const canModify =
    currentRole === "super_admin" || currentRole === "hr_admin";

  useEffect(() => {
    setMounted(true);
    fetchInsurance(employeeId);
    if (employees.length === 0) fetchEmployees();
  }, [employeeId, fetchInsurance, employees.length, fetchEmployees]);

  const handleFormSubmit = useCallback(
    async (formData: { insuredSalary: number; startDate: string; note?: string }) => {
      try {
        const fullData: InsuranceFormData = {
          ...formData,
          employeeId,
          status: record?.status ?? "active",
          endDate: record?.endDate ?? null,
          bhxhRate: INSURANCE_RATE_CONFIG.bhxh.employee,
          bhytRate: INSURANCE_RATE_CONFIG.bhyt.employee,
          bhtnRate: INSURANCE_RATE_CONFIG.bhtn.employee,
          bhxhEmployer: INSURANCE_RATE_CONFIG.bhxh.employer,
          bhytEmployer: INSURANCE_RATE_CONFIG.bhyt.employer,
          bhtnEmployer: INSURANCE_RATE_CONFIG.bhtn.employer,
        };
        if (record) {
          await updateInsurance(record.id, fullData);
          toast.success("Đã cập nhật bảo hiểm");
        } else {
          await createInsurance(fullData);
          toast.success("Đã khai báo bảo hiểm");
        }
        setFormOpen(false);
      } catch {
        toast.error("Không thể lưu");
      }
    },
    [record, employeeId, updateInsurance, createInsurance]
  );

  const handleSuspend = useCallback(async () => {
    if (!record) return;
    try {
      await suspendInsurance(record.id);
      toast.success("Đã tạm dừng bảo hiểm");
    } catch {
      toast.error("Không thể tạm dừng");
    } finally {
      setSuspendOpen(false);
    }
  }, [record, suspendInsurance]);

  const handleTerminate = useCallback(async () => {
    if (!record) return;
    try {
      await terminateInsurance(record.id);
      toast.success("Đã ngừng đóng bảo hiểm");
    } catch {
      toast.error("Không thể ngừng đóng");
    } finally {
      setTerminateOpen(false);
    }
  }, [record, terminateInsurance]);

  if (!mounted || loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/employees" className="hover:text-blue-600 transition-colors">
          Nhân viên
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/employees/${employeeId}`}
          className="hover:text-blue-600 transition-colors"
        >
          {employee?.name ?? employeeId}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-800 font-medium">Bảo hiểm</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bảo hiểm</h1>
          <p className="mt-1 text-sm text-slate-500">
            {employee?.name ?? "Nhân viên"} — {employee?.department ?? ""}
          </p>
        </div>
        {canModify && !record && (
          <Button onClick={() => setFormOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Khai báo bảo hiểm
          </Button>
        )}
      </div>

      {/* Content */}
      {record ? (
        <InsuranceDetail
          record={record}
          canModify={canModify}
          onEdit={() => setFormOpen(true)}
          onSuspend={() => setSuspendOpen(true)}
          onTerminate={() => setTerminateOpen(true)}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            Nhân viên này chưa được khai báo bảo hiểm
          </p>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {record ? "Cập nhật bảo hiểm" : "Khai báo bảo hiểm"}
            </DialogTitle>
          </DialogHeader>
          <InsuranceForm
            defaultValues={
              record
                ? {
                    insuredSalary: record.insuredSalary,
                    startDate: record.startDate,
                    note: record.note ?? "",
                  }
                : undefined
            }
            onSubmit={handleFormSubmit}
            isEdit={!!record}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title="Tạm dừng bảo hiểm?"
        description="Tạm dừng đóng BHXH/BHYT/BHTN. Có thể kích hoạt lại sau."
        onConfirm={handleSuspend}
        variant="destructive"
        confirmText="Tạm dừng"
      />
      <ConfirmDialog
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
        title="Ngừng đóng bảo hiểm?"
        description="Chấm dứt đóng BH. Hành động này KHÔNG thể hoàn tác."
        onConfirm={handleTerminate}
        variant="destructive"
        confirmText="Ngừng đóng"
      />
    </div>
  );
}
