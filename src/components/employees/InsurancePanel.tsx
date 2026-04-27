"use client";

// ============================================================================
// GK-HRMS — InsurancePanel
// Tab Bảo hiểm trong trang chi tiết nhân viên
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck,
  Loader2,
  RefreshCw,
  Plus,
  AlertTriangle,
  PauseCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useInsuranceStore } from "@/store/insuranceStore";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  INSURANCE_RATE_CONFIG,
  INSURANCE_STATUS_CONFIG,
  computeInsuranceSummary,
} from "@/types/insurance";
import type { InsuranceRecord, InsuranceStatus } from "@/types/insurance";

interface InsurancePanelProps {
  employeeId: string;
}

export function InsurancePanel({ employeeId }: InsurancePanelProps) {
  const canUpdate = usePermission("employee", "update");
  const canCreate = usePermission("employee", "create");
  const records = useInsuranceStore((s) => s.records);
  const loading = useInsuranceStore((s) => s.loading);
  const error = useInsuranceStore((s) => s.error);
  const fetchInsurance = useInsuranceStore((s) => s.fetchInsurance);
  const createInsurance = useInsuranceStore((s) => s.createInsurance);
  const updateInsurance = useInsuranceStore((s) => s.updateInsurance);
  const suspendInsurance = useInsuranceStore((s) => s.suspendInsurance);
  const insuranceByEmployee = useInsuranceStore((s) => s.insuranceByEmployee);

  const [fetched, setFetched] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form
  const [formSalary, setFormSalary] = useState(0);
  const [formStartDate, setFormStartDate] = useState("");
  const [formNote, setFormNote] = useState("");

  useEffect(() => {
    fetchInsurance(employeeId).finally(() => setFetched(true));
  }, [employeeId, fetchInsurance]);

  const record = insuranceByEmployee(employeeId);
  // Also consider suspended/terminated records
  const anyRecord = records.find((r) => r.employeeId === employeeId);

  const summary = useMemo(() => {
    if (!record) return null;
    return computeInsuranceSummary(record);
  }, [record]);

  // Preview for form
  const previewSummary = useMemo(() => {
    if (formSalary <= 0) return null;
    return computeInsuranceSummary({
      insuredSalary: formSalary,
      bhxhRate: INSURANCE_RATE_CONFIG.bhxh.employee,
      bhytRate: INSURANCE_RATE_CONFIG.bhyt.employee,
      bhtnRate: INSURANCE_RATE_CONFIG.bhtn.employee,
      bhxhEmployer: INSURANCE_RATE_CONFIG.bhxh.employer,
      bhytEmployer: INSURANCE_RATE_CONFIG.bhyt.employer,
      bhtnEmployer: INSURANCE_RATE_CONFIG.bhtn.employer,
    });
  }, [formSalary]);

  const handleCreate = async () => {
    if (formSalary <= 0 || !formStartDate) {
      toast.error("Vui lòng nhập mức lương và ngày bắt đầu");
      return;
    }
    setFormLoading(true);
    try {
      await createInsurance({
        employeeId,
        insuredSalary: formSalary,
        startDate: formStartDate,
        endDate: null,
        status: "active",
        note: formNote || undefined,
        bhxhRate: INSURANCE_RATE_CONFIG.bhxh.employee,
        bhytRate: INSURANCE_RATE_CONFIG.bhyt.employee,
        bhtnRate: INSURANCE_RATE_CONFIG.bhtn.employee,
        bhxhEmployer: INSURANCE_RATE_CONFIG.bhxh.employer,
        bhytEmployer: INSURANCE_RATE_CONFIG.bhyt.employer,
        bhtnEmployer: INSURANCE_RATE_CONFIG.bhtn.employer,
      });
      toast.success("Đã khai báo bảo hiểm");
      setShowCreateDialog(false);
      setFormSalary(0);
      setFormStartDate("");
      setFormNote("");
    } catch {
      toast.error("Không thể khai báo bảo hiểm.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!record || formSalary <= 0) return;
    setFormLoading(true);
    try {
      await updateInsurance(record.id, { insuredSalary: formSalary });
      toast.success("Đã cập nhật mức lương BH");
      setShowUpdateDialog(false);
    } catch {
      toast.error("Không thể cập nhật.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!record) return;
    setShowSuspendConfirm(false);
    try {
      await suspendInsurance(record.id);
      toast.success("Đã tạm dừng bảo hiểm");
    } catch {
      toast.error("Không thể tạm dừng.");
    }
  };

  const openUpdateDialog = () => {
    if (record) {
      setFormSalary(record.insuredSalary);
    }
    setShowUpdateDialog(true);
  };

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
        <Button size="sm" variant="outline" onClick={() => fetchInsurance(employeeId)} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Thử lại
        </Button>
      </div>
    );
  }

  // No record at all
  if (!anyRecord) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500 mb-3">Chưa có thông tin bảo hiểm</p>
          {canCreate && (
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Khai báo bảo hiểm
            </Button>
          )}
        </div>
        {renderCreateDialog()}
      </div>
    );
  }

  const displayRecord = record ?? anyRecord;
  const stCfg = INSURANCE_STATUS_CONFIG[displayRecord.status as InsuranceStatus];
  const displaySummary = displayRecord.status === "active" && summary
    ? summary
    : computeInsuranceSummary(displayRecord);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Lương đóng BH</p>
          <p className="mt-1 text-lg font-bold text-slate-800">
            {formatCurrency(displayRecord.insuredSalary)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs text-slate-500">NLĐ đóng/tháng</p>
          <p className="mt-1 text-lg font-bold text-blue-600">
            {formatCurrency(displaySummary.employeeContribution)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs text-slate-500">NSDLĐ đóng/tháng</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">
            {formatCurrency(displaySummary.employerContribution)}
          </p>
        </div>
      </div>

      {/* Rate table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b px-3 py-2 text-left font-medium text-slate-600">Khoản</th>
              <th className="border-b px-3 py-2 text-center font-medium text-slate-600">Tỷ lệ NLĐ</th>
              <th className="border-b px-3 py-2 text-center font-medium text-slate-600">Tỷ lệ NSDLĐ</th>
              <th className="border-b px-3 py-2 text-right font-medium text-slate-600">NLĐ/tháng</th>
              <th className="border-b px-3 py-2 text-right font-medium text-slate-600">NSDLĐ/tháng</th>
            </tr>
          </thead>
          <tbody>
            {(["bhxh", "bhyt", "bhtn"] as const).map((key) => {
              const cfg = INSURANCE_RATE_CONFIG[key];
              const empAmt = Math.round(displayRecord.insuredSalary * cfg.employee);
              const erAmt = Math.round(displayRecord.insuredSalary * cfg.employer);
              return (
                <tr key={key} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{cfg.label_vi}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{(cfg.employee * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center text-slate-600">{(cfg.employer * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(empAmt)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(erAmt)}</td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-3 py-2 text-slate-800">Tổng</td>
              <td className="px-3 py-2 text-center text-slate-800">{(INSURANCE_RATE_CONFIG.total.employee * 100).toFixed(1)}%</td>
              <td className="px-3 py-2 text-center text-slate-800">{(INSURANCE_RATE_CONFIG.total.employer * 100).toFixed(1)}%</td>
              <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(displaySummary.employeeContribution)}</td>
              <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(displaySummary.employerContribution)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Info + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          <span>Ngày tham gia: {formatDate(displayRecord.startDate)}</span>
          <span className="mx-2">·</span>
          <Badge className={`text-[10px] ${stCfg.badgeColor}`}>{stCfg.label_vi}</Badge>
        </div>
        {canUpdate && displayRecord.status === "active" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={openUpdateDialog} className="gap-1.5 text-xs">
              Cập nhật mức lương BH
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowSuspendConfirm(true)} className="gap-1.5 text-xs text-amber-600 hover:bg-amber-50">
              <PauseCircle className="h-3.5 w-3.5" /> Tạm dừng
            </Button>
          </div>
        )}
      </div>

      {/* Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Cập nhật mức lương BH</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Mức lương đóng BH (VND)</label>
              <Input type="number" value={formSalary} onChange={(e) => setFormSalary(Number(e.target.value))} className="text-sm" />
            </div>
            {previewSummary && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                NLĐ đóng: <strong>{formatCurrency(previewSummary.employeeContribution)}</strong>
                <span className="mx-2">|</span>
                Công ty đóng: <strong>{formatCurrency(previewSummary.employerContribution)}</strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowUpdateDialog(false)}>Hủy</Button>
            <Button size="sm" onClick={handleUpdate} disabled={formLoading} className="gap-1.5">
              {formLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend confirm */}
      <ConfirmDialog
        open={showSuspendConfirm}
        onOpenChange={setShowSuspendConfirm}
        title="Tạm dừng bảo hiểm"
        description="Bảo hiểm sẽ bị tạm dừng. NV sẽ không được tính đóng BH trong kỳ lương."
        confirmText="Tạm dừng"
        variant="default"
        onConfirm={handleSuspend}
      />

      {renderCreateDialog()}
    </div>
  );

  function renderCreateDialog() {
    return (
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Khai báo bảo hiểm</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Mức lương đóng BH (VND) *</label>
              <Input type="number" value={formSalary} onChange={(e) => setFormSalary(Number(e.target.value))} className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Ngày bắt đầu *</label>
              <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Ghi chú</label>
              <textarea value={formNote} onChange={(e) => setFormNote(e.target.value)} className="w-full rounded-md border p-2 text-sm" rows={2} />
            </div>
            {previewSummary && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                NLĐ đóng: <strong>{formatCurrency(previewSummary.employeeContribution)}</strong>
                <span className="mx-2">|</span>
                Công ty đóng: <strong>{formatCurrency(previewSummary.employerContribution)}</strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(false)}>Hủy</Button>
            <Button size="sm" onClick={handleCreate} disabled={formLoading} className="gap-1.5">
              {formLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
