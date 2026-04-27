"use client";

// ============================================================================
// GK-HRMS — RewardPageClient
// Trang chi tiết Khen thưởng & Kỷ luật của 1 nhân viên
// Tabs: Khen thưởng | Kỷ luật
// Dialog: Add/Edit RewardForm, Add/Edit DisciplineForm
// ============================================================================

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Award, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RewardTable } from "@/components/rewards/RewardTable";
import { DisciplineTable } from "@/components/rewards/DisciplineTable";
import { RewardForm } from "@/components/rewards/RewardForm";
import { DisciplineForm } from "@/components/rewards/DisciplineForm";
import { useRewardStore } from "@/store/rewardStore";
import { useEmployeeStore } from "@/store/employeeStore";
import { useAccountStore } from "@/store/accountStore";
import type { RewardRecord, RewardFormData, DisciplineRecord, DisciplineFormData } from "@/types/reward";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RewardPageClientProps {
  employeeId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmployeeRewardPanel({ employeeId }: RewardPageClientProps) {
  // ── Store ──
  const {
    fetchRewards,
    fetchDisciplines,
    rewardsByEmployee,
    disciplinesByEmployee,
    addReward,
    addDiscipline,
    updateReward,
    updateDiscipline,
    deleteReward,
    deleteDiscipline,
    rewardsLoading,
    disciplinesLoading,
  } = useRewardStore();

  const employees = useEmployeeStore((s) => s.employees);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const currentRole = useAccountStore((s) => s.currentUser.role);

  // ── Local state ──
  const [mounted, setMounted] = useState(false);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [disciplineDialogOpen, setDisciplineDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardRecord | null>(null);
  const [editingDiscipline, setEditingDiscipline] = useState<DisciplineRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "reward" | "discipline"; id: string } | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ── Derived ──
  const employee = employees.find((e) => e.id === employeeId);
  const rewards = rewardsByEmployee(employeeId);
  const disciplines = disciplinesByEmployee(employeeId);
  const canCreate = currentRole === "super_admin" || currentRole === "hr_admin";

  // ── Effects ──
  useEffect(() => {
    setMounted(true);
    fetchRewards(employeeId);
    fetchDisciplines(employeeId);
    if (employees.length === 0) fetchEmployees();
  }, [employeeId, fetchRewards, fetchDisciplines, employees.length, fetchEmployees]);

  // ── Handlers: Reward ──
  const handleRewardSubmit = useCallback(
    async (data: RewardFormData) => {
      setFormLoading(true);
      try {
        if (editingReward) {
          await updateReward(editingReward.id, data);
          toast.success("Đã cập nhật khen thưởng");
        } else {
          await addReward(data);
          toast.success("Đã thêm khen thưởng");
        }
        setRewardDialogOpen(false);
        setEditingReward(null);
      } catch {
        toast.error("Không thể lưu khen thưởng. Vui lòng thử lại.");
      } finally {
        setFormLoading(false);
      }
    },
    [editingReward, updateReward, addReward]
  );

  const handleEditReward = useCallback((reward: RewardRecord) => {
    setEditingReward(reward);
    setRewardDialogOpen(true);
  }, []);

  // ── Handlers: Discipline ──
  const handleDisciplineSubmit = useCallback(
    async (data: DisciplineFormData) => {
      setFormLoading(true);
      try {
        if (editingDiscipline) {
          await updateDiscipline(editingDiscipline.id, data);
          toast.success("Đã cập nhật kỷ luật");
        } else {
          await addDiscipline(data);
          toast.success("Đã thêm kỷ luật");
        }
        setDisciplineDialogOpen(false);
        setEditingDiscipline(null);
      } catch {
        toast.error("Không thể lưu kỷ luật. Vui lòng thử lại.");
      } finally {
        setFormLoading(false);
      }
    },
    [editingDiscipline, updateDiscipline, addDiscipline]
  );

  const handleEditDiscipline = useCallback((disc: DisciplineRecord) => {
    setEditingDiscipline(disc);
    setDisciplineDialogOpen(true);
  }, []);

  // ── Handler: Delete ──
  const handleConfirmDelete = useCallback(async () => {
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
      toast.error("Không thể xóa. Vui lòng thử lại.");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteReward, deleteDiscipline]);

  // ── Loading skeleton ──
  if (!mounted || rewardsLoading || disciplinesLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Breadcrumb ── */}
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
        <span className="text-slate-800 font-medium">
          Khen thưởng & Kỷ luật
        </span>
      </nav>

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Khen thưởng & Kỷ luật
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {employee?.name ?? "Nhân viên"} — {employee?.department ?? ""}
          </p>
        </div>

        {canCreate && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setEditingReward(null);
                setRewardDialogOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Thêm khen thưởng
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingDiscipline(null);
                setDisciplineDialogOpen(true);
              }}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Thêm kỷ luật
            </Button>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="rewards" className="w-full">
        <TabsList>
          <TabsTrigger value="rewards" className="gap-1.5">
            <Award className="h-4 w-4" />
            Khen thưởng ({rewards.length})
          </TabsTrigger>
          <TabsTrigger value="disciplines" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Kỷ luật ({disciplines.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <RewardTable
              rewards={rewards}
              onEdit={canCreate ? handleEditReward : undefined}
              onDelete={
                canCreate
                  ? (id) => setDeleteTarget({ type: "reward", id })
                  : undefined
              }
              canModify={canCreate}
            />
          </div>
        </TabsContent>

        <TabsContent value="disciplines" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <DisciplineTable
              disciplines={disciplines}
              onEdit={canCreate ? handleEditDiscipline : undefined}
              onDelete={
                canCreate
                  ? (id) => setDeleteTarget({ type: "discipline", id })
                  : undefined
              }
              canModify={canCreate}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Reward Dialog ── */}
      <Dialog
        open={rewardDialogOpen}
        onOpenChange={(open) => {
          setRewardDialogOpen(open);
          if (!open) setEditingReward(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingReward ? "Sửa khen thưởng" : "Thêm khen thưởng"}
            </DialogTitle>
          </DialogHeader>
          <RewardForm
            employeeId={employeeId}
            defaultValues={editingReward ?? undefined}
            onSubmit={handleRewardSubmit}
            isLoading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* ── Discipline Dialog ── */}
      <Dialog
        open={disciplineDialogOpen}
        onOpenChange={(open) => {
          setDisciplineDialogOpen(open);
          if (!open) setEditingDiscipline(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingDiscipline ? "Sửa kỷ luật" : "Thêm kỷ luật"}
            </DialogTitle>
          </DialogHeader>
          <DisciplineForm
            employeeId={employeeId}
            defaultValues={editingDiscipline ?? undefined}
            onSubmit={handleDisciplineSubmit}
            isLoading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={
          deleteTarget?.type === "reward"
            ? "Xóa khen thưởng"
            : "Xóa kỷ luật"
        }
        description="Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa?"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
}
