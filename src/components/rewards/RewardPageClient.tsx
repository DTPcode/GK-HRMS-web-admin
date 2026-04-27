"use client";

// ============================================================================
// GK-HRMS — RewardPageClient (Global)
// Trang quản lý Khen thưởng & Kỷ luật toàn chuỗi
// Tabs: Khen thưởng | Kỷ luật
// Filter: search, chi nhánh, phòng ban, loại, ngày
// RBAC: branch_manager chỉ thấy NV chi nhánh mình
// ============================================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Award,
  AlertTriangle,
  Plus,
  Banknote,
  CircleDollarSign,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RewardTable } from "@/components/rewards/RewardTable";
import { DisciplineTable } from "@/components/rewards/DisciplineTable";
import { RewardForm } from "@/components/rewards/RewardForm";
import { DisciplineForm } from "@/components/rewards/DisciplineForm";
import { useRewardStore } from "@/store/rewardStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { useAccountStore } from "@/store/accountStore";
import { BRANCH_LIST, DEPARTMENT_LIST } from "@/types/employee";
import type {
  RewardRecord,
  RewardFormData,
  DisciplineRecord,
  DisciplineFormData,
} from "@/types/reward";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n);

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RewardPageClient() {
  // store
  const rewards = useRewardStore((s) => s.rewards);
  const disciplines = useRewardStore((s) => s.disciplines);
  const loading = useRewardStore((s) => s.rewardsLoading || s.disciplinesLoading);
  const error = useRewardStore((s) => s.error);
  const fetchRewards = useRewardStore((s) => s.fetchRewards);
  const fetchDisciplines = useRewardStore((s) => s.fetchDisciplines);
  const addReward = useRewardStore((s) => s.addReward);
  const addDiscipline = useRewardStore((s) => s.addDiscipline);
  const updateReward = useRewardStore((s) => s.updateReward);
  const updateDiscipline = useRewardStore((s) => s.updateDiscipline);
  const deleteReward = useRewardStore((s) => s.deleteReward);
  const deleteDiscipline = useRewardStore((s) => s.deleteDiscipline);

  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);

  const currentUser = useAccountStore((s) => s.currentUser);
  const isBM = currentUser.role === "branch_manager";
  const canCreate =
    currentUser.role === "super_admin" || currentUser.role === "hr_admin";

  // filters
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  // dialogs
  const [rewardOpen, setRewardOpen] = useState(false);
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [editReward, setEditReward] = useState<RewardRecord | null>(null);
  const [editDiscipline, setEditDiscipline] = useState<DisciplineRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "reward" | "discipline";
    id: string;
  } | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchRewards();
    fetchDisciplines();
    if (employees.length === 0) fetchEmployees();
  }, [fetchRewards, fetchDisciplines, fetchEmployees, employees.length]);

  // ── Employee lookup ──
  const empMap = useMemo(() => {
    const m = new Map<string, (typeof employees)[0]>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  // ── Filtered rewards ──
  const filteredRewards = useMemo(() => {
    return rewards.filter((r) => {
      const emp = empMap.get(r.employeeId);
      if (!emp) return false;
      if (isBM && currentUser.branchId && emp.branchId !== currentUser.branchId)
        return false;
      if (branchFilter !== "all" && emp.branchId !== branchFilter) return false;
      if (deptFilter !== "all" && emp.department !== deptFilter) return false;
      if (
        search &&
        !emp.name.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rewards, empMap, isBM, currentUser.branchId, branchFilter, deptFilter, search]);

  // ── Filtered disciplines ──
  const filteredDisciplines = useMemo(() => {
    return disciplines.filter((d) => {
      const emp = empMap.get(d.employeeId);
      if (!emp) return false;
      if (isBM && currentUser.branchId && emp.branchId !== currentUser.branchId)
        return false;
      if (branchFilter !== "all" && emp.branchId !== branchFilter) return false;
      if (deptFilter !== "all" && emp.department !== deptFilter) return false;
      if (
        search &&
        !emp.name.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [disciplines, empMap, isBM, currentUser.branchId, branchFilter, deptFilter, search]);

  // ── Stats ──
  const month = thisMonth();
  const rewardsThisMonth = filteredRewards.filter((r) =>
    r.effectiveDate.startsWith(month)
  );
  const disciplinesThisMonth = filteredDisciplines.filter((d) =>
    d.effectiveDate.startsWith(month)
  );
  const totalRewardAmount = rewardsThisMonth.reduce(
    (s, r) => s + r.amount,
    0
  );
  const totalPenaltyAmount = disciplinesThisMonth.reduce(
    (s, d) => s + d.penaltyAmount,
    0
  );

  // ── Handlers ──
  const handleRewardSubmit = useCallback(
    async (data: RewardFormData) => {
      setFormLoading(true);
      try {
        if (editReward) {
          await updateReward(editReward.id, data);
          toast.success("Đã cập nhật khen thưởng");
        } else {
          await addReward(data);
          toast.success("Đã thêm khen thưởng");
        }
        setRewardOpen(false);
        setEditReward(null);
      } catch {
        toast.error("Không thể lưu khen thưởng");
      } finally {
        setFormLoading(false);
      }
    },
    [editReward, updateReward, addReward]
  );

  const handleDisciplineSubmit = useCallback(
    async (data: DisciplineFormData) => {
      setFormLoading(true);
      try {
        if (editDiscipline) {
          await updateDiscipline(editDiscipline.id, data);
          toast.success("Đã cập nhật kỷ luật");
        } else {
          await addDiscipline(data);
          toast.success("Đã thêm kỷ luật");
        }
        setDisciplineOpen(false);
        setEditDiscipline(null);
      } catch {
        toast.error("Không thể lưu kỷ luật");
      } finally {
        setFormLoading(false);
      }
    },
    [editDiscipline, updateDiscipline, addDiscipline]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "reward") {
        await deleteReward(deleteTarget.id);
        toast.success("Đã xóa khen thưởng");
      } else {
        await deleteDiscipline(deleteTarget.id);
        toast.success("Đã xóa kỷ luật");
      }
    } catch {
      toast.error("Không thể xóa");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteReward, deleteDiscipline]);

  if (loading && rewards.length === 0 && disciplines.length === 0)
    return <TableSkeleton rows={6} columns={5} />;
  if (error && rewards.length === 0 && disciplines.length === 0)
    return <ErrorMessage message={error} onRetry={() => { fetchRewards(); fetchDisciplines(); }} />;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Khen thưởng & Kỷ luật
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý khen thưởng và kỷ luật toàn chuỗi
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setEditReward(null);
                setRewardOpen(true);
              }}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Thêm khen thưởng
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditDiscipline(null);
                setDisciplineOpen(true);
              }}
              className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
            >
              <Plus className="h-4 w-4" />
              Thêm kỷ luật
            </Button>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Award className="h-5 w-5 text-emerald-500" />}
          label="Khen thưởng tháng này"
          value={String(rewardsThisMonth.length)}
          color="text-emerald-600"
        />
        <StatCard
          icon={<Banknote className="h-5 w-5 text-green-500" />}
          label="Tổng tiền thưởng"
          value={`${fmt(totalRewardAmount)}₫`}
          color="text-green-600"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          label="Kỷ luật tháng này"
          value={String(disciplinesThisMonth.length)}
          color="text-red-600"
        />
        <StatCard
          icon={<CircleDollarSign className="h-5 w-5 text-orange-500" />}
          label="Tổng tiền phạt"
          value={`${fmt(totalPenaltyAmount)}₫`}
          color="text-orange-600"
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Tìm theo tên nhân viên..."
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
              {BRANCH_LIST.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name.replace("Gia Khánh - ", "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={deptFilter}
          onValueChange={(v) => setDeptFilter(v ?? "all")}
        >
          <SelectTrigger className="w-40 text-sm">
            <SelectValue placeholder="Phòng ban" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả PB</SelectItem>
            {DEPARTMENT_LIST.map((d) => (
              <SelectItem key={d.id} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="rewards">
        <TabsList>
          <TabsTrigger value="rewards" className="gap-1.5">
            <Award className="h-4 w-4" />
            Khen thưởng
            {filteredRewards.length > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] rounded-full bg-emerald-500 px-1.5 text-[10px] text-white">
                {filteredRewards.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="disciplines" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Kỷ luật
            {filteredDisciplines.length > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] rounded-full bg-red-500 px-1.5 text-[10px] text-white">
                {filteredDisciplines.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="mt-4">
          <RewardTable
            rewards={filteredRewards}
            employees={employees}
            onEdit={canCreate ? (r) => { setEditReward(r); setRewardOpen(true); } : undefined}
            onDelete={canCreate ? (id) => setDeleteTarget({ type: "reward", id }) : undefined}
            canModify={canCreate}
          />
        </TabsContent>

        <TabsContent value="disciplines" className="mt-4">
          <DisciplineTable
            disciplines={filteredDisciplines}
            employees={employees}
            onEdit={canCreate ? (d) => { setEditDiscipline(d); setDisciplineOpen(true); } : undefined}
            onDelete={canCreate ? (id) => setDeleteTarget({ type: "discipline", id }) : undefined}
            canModify={canCreate}
          />
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <Dialog
        open={rewardOpen}
        onOpenChange={(o) => {
          setRewardOpen(o);
          if (!o) setEditReward(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editReward ? "Sửa khen thưởng" : "Thêm khen thưởng"}
            </DialogTitle>
          </DialogHeader>
          <RewardForm
            defaultValues={editReward ?? undefined}
            onSubmit={handleRewardSubmit}
            isLoading={formLoading}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={disciplineOpen}
        onOpenChange={(o) => {
          setDisciplineOpen(o);
          if (!o) setEditDiscipline(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editDiscipline ? "Sửa kỷ luật" : "Thêm kỷ luật"}
            </DialogTitle>
          </DialogHeader>
          <DisciplineForm
            defaultValues={editDiscipline ?? undefined}
            onSubmit={handleDisciplineSubmit}
            isLoading={formLoading}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title={
          deleteTarget?.type === "reward" ? "Xóa khen thưởng" : "Xóa kỷ luật"
        }
        description="Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa?"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
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
