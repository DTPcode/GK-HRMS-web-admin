"use client";

// ============================================================================
// GK-HRMS — InsurancePageClient (Global)
// Trang quản lý BHXH · BHYT · BHTN toàn chuỗi
// Hiện NV chưa khai báo BH + NV đã có BH
// RBAC: branch_manager chỉ thấy NV chi nhánh mình
// ============================================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Plus,
  RefreshCw,
  PauseCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { InsuranceForm } from "@/components/insurance/InsuranceForm";
import { useInsuranceStore } from "@/store/insuranceStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { useAccountStore } from "@/store/accountStore";
import {
  INSURANCE_STATUS_CONFIG,
  INSURANCE_RATE_CONFIG,
  computeInsuranceSummary,
} from "@/types/insurance";
import type { InsuranceRecord, InsuranceFormData } from "@/types/insurance";
import { BRANCH_LIST as EMP_BRANCHES } from "@/types/employee";
import { getInitials, cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n);
const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};
function getBranchShort(id: string) {
  return EMP_BRANCHES.find((b) => b.id === id)?.name.replace("Gia Khánh - ", "") ?? id;
}

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

interface InsuranceRow {
  employeeId: string;
  employeeName: string;
  branchId: string;
  department: string;
  insurance: InsuranceRecord | null; // null = chưa khai báo
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InsurancePageClient() {
  const insurances = useInsuranceStore((s) => s.records);
  const loading = useInsuranceStore((s) => s.loading);
  const error = useInsuranceStore((s) => s.error);
  const fetchInsurance = useInsuranceStore((s) => s.fetchInsurance);
  const addInsurance = useInsuranceStore((s) => s.createInsurance);
  const updateInsurance = useInsuranceStore((s) => s.updateInsurance);
  const suspendInsurance = useInsuranceStore((s) => s.suspendInsurance);

  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);

  const currentUser = useAccountStore((s) => s.currentUser);
  const isBM = currentUser.role === "branch_manager";
  const canModify =
    currentUser.role === "super_admin" || currentUser.role === "hr_admin";

  // filters
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InsuranceRecord | null>(null);
  const [formEmpId, setFormEmpId] = useState<string>("");
  const [formLoading, setFormLoading] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<InsuranceRecord | null>(null);

  useEffect(() => {
    fetchInsurance();
    if (employees.length === 0) fetchEmployees();
  }, [fetchInsurance, fetchEmployees, employees.length]);

  // ── Build rows: merge employees + insurance ──
  const rows = useMemo<InsuranceRow[]>(() => {
    const insMap = new Map<string, InsuranceRecord>();
    insurances.forEach((i) => insMap.set(i.employeeId, i));

    const activeEmployees = employees.filter((e) => e.status === "active");
    return activeEmployees.map((e) => ({
      employeeId: e.id,
      employeeName: e.name,
      branchId: e.branchId,
      department: e.department,
      insurance: insMap.get(e.id) ?? null,
    }));
  }, [employees, insurances]);

  // ── Filter ──
  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        // BM scope
        if (isBM && currentUser.branchId && r.branchId !== currentUser.branchId)
          return false;
        // branch filter
        if (branchFilter !== "all" && r.branchId !== branchFilter) return false;
        // status filter
        if (statusFilter === "none" && r.insurance !== null) return false;
        if (
          statusFilter !== "all" &&
          statusFilter !== "none" &&
          r.insurance?.status !== statusFilter
        )
          return false;
        // search
        if (
          search &&
          !r.employeeName.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        // Chưa khai báo lên đầu
        if (!a.insurance && b.insurance) return -1;
        if (a.insurance && !b.insurance) return 1;
        return a.employeeName.localeCompare(b.employeeName);
      });
  }, [rows, isBM, currentUser.branchId, branchFilter, statusFilter, search]);

  // ── Stats ──
  const insuredCount = rows.filter(
    (r) => r.insurance?.status === "active"
  ).length;
  const uninsuredCount = rows.filter((r) => r.insurance === null).length;
  const totalEmpContrib = rows
    .filter((r) => r.insurance?.status === "active")
    .reduce((s, r) => {
      if (!r.insurance) return s;
      return s + computeInsuranceSummary(r.insurance).employeeContribution;
    }, 0);
  const totalErContrib = rows
    .filter((r) => r.insurance?.status === "active")
    .reduce((s, r) => {
      if (!r.insurance) return s;
      return s + computeInsuranceSummary(r.insurance).employerContribution;
    }, 0);

  // ── Handlers ──
  const handleSubmit = useCallback(
    async (data: InsuranceFormData) => {
      setFormLoading(true);
      try {
        if (editTarget) {
          await updateInsurance(editTarget.id, data);
          toast.success("Đã cập nhật bảo hiểm");
        } else {
          await addInsurance(data);
          toast.success("Đã khai báo bảo hiểm");
        }
        setFormOpen(false);
        setEditTarget(null);
        setFormEmpId("");
      } catch {
        toast.error("Không thể lưu");
      } finally {
        setFormLoading(false);
      }
    },
    [editTarget, updateInsurance, addInsurance]
  );

  const handleSuspend = useCallback(async () => {
    if (!suspendTarget) return;
    try {
      await suspendInsurance(suspendTarget.id);
      toast.success("Đã tạm dừng bảo hiểm");
    } catch {
      toast.error("Không thể tạm dừng");
    } finally {
      setSuspendTarget(null);
    }
  }, [suspendTarget, suspendInsurance]);

  const handleReactivate = useCallback(
    async (id: string) => {
      try {
        await updateInsurance(id, { status: "active" } as Partial<InsuranceFormData>);
        toast.success("Đã kích hoạt lại bảo hiểm");
      } catch {
        toast.error("Không thể kích hoạt lại");
      }
    },
    [updateInsurance]
  );

  if (loading && rows.length === 0)
    return <TableSkeleton rows={6} columns={6} />;
  if (error && rows.length === 0)
    return <ErrorMessage message={error} onRetry={fetchInsurance} />;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Quản lý Bảo hiểm
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              BHXH · BHYT · BHTN toàn chuỗi
            </p>
          </div>
          {canModify && (
            <Button
              onClick={() => {
                setEditTarget(null);
                setFormEmpId("");
                setFormOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Khai báo bảo hiểm
            </Button>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<ShieldCheck className="h-5 w-5 text-emerald-500" />}
            label="Đang tham gia BH"
            value={String(insuredCount)}
            color="text-emerald-600"
          />
          <StatCard
            icon={<ShieldAlert className="h-5 w-5 text-amber-500" />}
            label="Chưa khai báo BH"
            value={String(uninsuredCount)}
            color="text-amber-600"
          />
          <StatCard
            icon={<ShieldX className="h-5 w-5 text-blue-500" />}
            label="NLĐ đóng/tháng"
            value={`${fmt(totalEmpContrib)}₫`}
            color="text-blue-600"
          />
          <StatCard
            icon={<ShieldCheck className="h-5 w-5 text-purple-500" />}
            label="NSDLĐ đóng/tháng"
            value={`${fmt(totalErContrib)}₫`}
            color="text-purple-600"
          />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Tìm theo tên NV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 text-sm"
          />
          {!isBM && (
            <Select
              value={branchFilter}
              onValueChange={(v) => setBranchFilter(v ?? "all")}
            >
              <SelectTrigger className="w-44 text-sm">
                <SelectValue placeholder="Chi nhánh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả chi nhánh</SelectItem>
                {EMP_BRANCHES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name.replace("Gia Khánh - ", "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "all")}
          >
            <SelectTrigger className="w-44 text-sm">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Đang tham gia</SelectItem>
              <SelectItem value="suspended">Tạm dừng</SelectItem>
              <SelectItem value="terminated">Đã chấm dứt</SelectItem>
              <SelectItem value="none">Chưa khai báo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Table ── */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Không có dữ liệu</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
                    Nhân viên
                  </th>
                  <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
                    Chi nhánh
                  </th>
                  <th className="border-b px-3 py-2.5 text-right font-medium text-slate-600">
                    Lương đóng BH
                  </th>
                  <th className="border-b px-3 py-2.5 text-right font-medium text-slate-600">
                    NLĐ đóng/tháng
                  </th>
                  <th className="border-b px-3 py-2.5 text-right font-medium text-slate-600">
                    NSDLĐ đóng/tháng
                  </th>
                  <th className="border-b px-3 py-2.5 text-left font-medium text-slate-600">
                    Ngày bắt đầu
                  </th>
                  <th className="border-b px-3 py-2.5 text-center font-medium text-slate-600">
                    Trạng thái
                  </th>
                  {canModify && (
                    <th className="border-b px-3 py-2.5 text-center font-medium text-slate-600">
                      Thao tác
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const ins = row.insurance;
                  const summary = ins ? computeInsuranceSummary(ins) : null;
                  const noInsurance = ins === null;

                  return (
                    <tr
                      key={row.employeeId}
                      className={cn(
                        "border-b border-slate-100 transition-colors",
                        noInsurance
                          ? "bg-amber-50/40 hover:bg-amber-50"
                          : "hover:bg-slate-50/50"
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/employees/${row.employeeId}`}
                          className="flex items-center gap-2 hover:text-blue-600"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                            {getInitials(row.employeeName)}
                          </div>
                          <span className="font-medium text-slate-800">
                            {row.employeeName}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">
                        {getBranchShort(row.branchId)}
                      </td>

                      {noInsurance ? (
                        <>
                          <td className="px-3 py-2.5 text-right text-slate-300">
                            —
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-300">
                            —
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-300">
                            —
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">—</td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge className="bg-slate-100 text-[10px] text-slate-500">
                              Chưa khai báo
                            </Badge>
                          </td>
                          {canModify && (
                            <td className="px-3 py-2.5 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 px-2 text-xs text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setEditTarget(null);
                                  setFormEmpId(row.employeeId);
                                  setFormOpen(true);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" /> Khai báo
                              </Button>
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                            {fmt(ins!.insuredSalary)}₫
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Tooltip>
                              <TooltipTrigger className="font-mono text-blue-600 underline decoration-dotted">
                                {fmt(summary!.employeeContribution)}₫
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                <p>
                                  BHXH: {fmt(Math.round(ins!.insuredSalary * ins!.bhxhRate))}₫ (
                                  {(ins!.bhxhRate * 100).toFixed(1)}%)
                                </p>
                                <p>
                                  BHYT: {fmt(Math.round(ins!.insuredSalary * ins!.bhytRate))}₫ (
                                  {(ins!.bhytRate * 100).toFixed(1)}%)
                                </p>
                                <p>
                                  BHTN: {fmt(Math.round(ins!.insuredSalary * ins!.bhtnRate))}₫ (
                                  {(ins!.bhtnRate * 100).toFixed(1)}%)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Tooltip>
                              <TooltipTrigger className="font-mono text-purple-600 underline decoration-dotted">
                                {fmt(summary!.employerContribution)}₫
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                <p>
                                  BHXH: {fmt(Math.round(ins!.insuredSalary * ins!.bhxhEmployer))}₫ (
                                  {(ins!.bhxhEmployer * 100).toFixed(1)}%)
                                </p>
                                <p>
                                  BHYT: {fmt(Math.round(ins!.insuredSalary * ins!.bhytEmployer))}₫ (
                                  {(ins!.bhytEmployer * 100).toFixed(1)}%)
                                </p>
                                <p>
                                  BHTN: {fmt(Math.round(ins!.insuredSalary * ins!.bhtnEmployer))}₫ (
                                  {(ins!.bhtnEmployer * 100).toFixed(1)}%)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {fmtDate(ins!.startDate)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge
                              className={cn(
                                "text-[10px]",
                                INSURANCE_STATUS_CONFIG[ins!.status].badgeColor
                              )}
                            >
                              {INSURANCE_STATUS_CONFIG[ins!.status].label_vi}
                            </Badge>
                          </td>
                          {canModify && (
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {ins!.status === "active" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                                      onClick={() => {
                                        setEditTarget(ins!);
                                        setFormEmpId(row.employeeId);
                                        setFormOpen(true);
                                      }}
                                    >
                                      Cập nhật
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 gap-1 px-2 text-xs text-amber-600 hover:bg-amber-50"
                                      onClick={() => setSuspendTarget(ins!)}
                                    >
                                      <PauseCircle className="h-3 w-3" />
                                      Dừng
                                    </Button>
                                  </>
                                )}
                                {ins!.status === "suspended" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 gap-1 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                                    onClick={() =>
                                      handleReactivate(ins!.id)
                                    }
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                    Kích hoạt
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Form Dialog ── */}
        <Dialog
          open={formOpen}
          onOpenChange={(o) => {
            setFormOpen(o);
            if (!o) {
              setEditTarget(null);
              setFormEmpId("");
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editTarget ? "Cập nhật bảo hiểm" : "Khai báo bảo hiểm"}
              </DialogTitle>
            </DialogHeader>
            <InsuranceForm
              defaultValues={editTarget ? { insuredSalary: editTarget.insuredSalary, startDate: editTarget.startDate, note: editTarget.note ?? "" } : undefined}
              onSubmit={(formData) => {
                const eid = formEmpId || editTarget?.employeeId;
                if (!eid) { toast.error("Chưa chọn nhân viên"); return; }
                const fullData = {
                  ...formData,
                  employeeId: eid,
                  status: editTarget?.status ?? ("active" as const),
                  endDate: editTarget?.endDate ?? null,
                  bhxhRate: editTarget?.bhxhRate ?? 0.08,
                  bhytRate: editTarget?.bhytRate ?? 0.015,
                  bhtnRate: editTarget?.bhtnRate ?? 0.01,
                  bhxhEmployer: editTarget?.bhxhEmployer ?? 0.175,
                  bhytEmployer: editTarget?.bhytEmployer ?? 0.03,
                  bhtnEmployer: editTarget?.bhtnEmployer ?? 0.01,
                };
                handleSubmit(fullData as any);
              }}
              isLoading={formLoading}
              isEdit={!!editTarget}
            />
          </DialogContent>
        </Dialog>

        {/* ── Suspend Confirm ── */}
        <ConfirmDialog
          open={suspendTarget !== null}
          onOpenChange={(o) => {
            if (!o) setSuspendTarget(null);
          }}
          title="Tạm dừng bảo hiểm?"
          description="Tạm dừng đóng BHXH/BHYT/BHTN cho nhân viên này. Có thể kích hoạt lại sau."
          onConfirm={handleSuspend}
          variant="destructive"
          confirmText="Tạm dừng"
        />
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
