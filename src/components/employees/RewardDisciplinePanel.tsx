"use client";

// ============================================================================
// GK-HRMS — RewardDisciplinePanel
// Tab Khen thưởng & Kỷ luật trong trang chi tiết nhân viên
// ============================================================================

import { useEffect, useState } from "react";
import {
  Award,
  AlertTriangle,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useRewardStore } from "@/store/rewardStore";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  REWARD_TYPE_CONFIG,
  DISCIPLINE_TYPE_CONFIG,
  DISCIPLINE_STATUS_CONFIG,
} from "@/types/reward";
import type {
  RewardType,
  DisciplineType,
  RewardRecord,
  DisciplineRecord,
} from "@/types/reward";

interface RewardDisciplinePanelProps {
  employeeId: string;
}

export function RewardDisciplinePanel({ employeeId }: RewardDisciplinePanelProps) {
  const canCreate = usePermission("employee", "create");
  const rewards = useRewardStore((s) => s.rewards);
  const disciplines = useRewardStore((s) => s.disciplines);
  const loading = useRewardStore((s) => s.rewardsLoading || s.disciplinesLoading);
  const error = useRewardStore((s) => s.error);
  const fetchRewards = useRewardStore((s) => s.fetchRewards);
  const fetchDisciplines = useRewardStore((s) => s.fetchDisciplines);
  const addReward = useRewardStore((s) => s.addReward);
  const addDiscipline = useRewardStore((s) => s.addDiscipline);
  const deleteReward = useRewardStore((s) => s.deleteReward);
  const deleteDiscipline = useRewardStore((s) => s.deleteDiscipline);
  const rewardsByEmployee = useRewardStore((s) => s.rewardsByEmployee);
  const disciplinesByEmployee = useRewardStore((s) => s.disciplinesByEmployee);

  const [fetched, setFetched] = useState(false);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [showDisciplineDialog, setShowDisciplineDialog] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "reward" | "discipline"; id: string; name: string } | null>(null);

  // Reward form
  const [rType, setRType] = useState<RewardType>("bonus");
  const [rTitle, setRTitle] = useState("");
  const [rAmount, setRAmount] = useState(0);
  const [rReason, setRReason] = useState("");
  const [rDate, setRDate] = useState("");
  const [rPayrollMonth, setRPayrollMonth] = useState("");

  // Discipline form
  const [dType, setDType] = useState<DisciplineType>("warning");
  const [dTitle, setDTitle] = useState("");
  const [dPenalty, setDPenalty] = useState(0);
  const [dReason, setDReason] = useState("");
  const [dDate, setDDate] = useState("");
  const [dEndDate, setDEndDate] = useState("");
  const [dPayrollMonth, setDPayrollMonth] = useState("");

  useEffect(() => {
    Promise.all([fetchRewards(employeeId), fetchDisciplines(employeeId)]).finally(
      () => setFetched(true)
    );
  }, [employeeId, fetchRewards, fetchDisciplines]);

  const empRewards = rewardsByEmployee(employeeId);
  const empDisciplines = disciplinesByEmployee(employeeId);

  const resetRewardForm = () => {
    setRType("bonus"); setRTitle(""); setRAmount(0); setRReason(""); setRDate(""); setRPayrollMonth("");
    setShowRewardDialog(false);
  };

  const resetDisciplineForm = () => {
    setDType("warning"); setDTitle(""); setDPenalty(0); setDReason(""); setDDate(""); setDEndDate(""); setDPayrollMonth("");
    setShowDisciplineDialog(false);
  };

  const handleAddReward = async () => {
    if (!rTitle || !rReason || rReason.length < 10 || !rDate) {
      toast.error("Vui lòng điền đầy đủ thông tin (lý do tối thiểu 10 ký tự)");
      return;
    }
    setFormLoading(true);
    try {
      await addReward({
        employeeId,
        type: rType,
        title: rTitle,
        amount: rAmount,
        reason: rReason,
        effectiveDate: rDate,
        linkedPayrollMonth: rPayrollMonth || null,
      });
      toast.success("Đã thêm khen thưởng");
      resetRewardForm();
    } catch { toast.error("Không thể thêm khen thưởng."); }
    finally { setFormLoading(false); }
  };

  const handleAddDiscipline = async () => {
    if (!dTitle || !dReason || dReason.length < 10 || !dDate) {
      toast.error("Vui lòng điền đầy đủ thông tin (lý do tối thiểu 10 ký tự)");
      return;
    }
    setFormLoading(true);
    try {
      await addDiscipline({
        employeeId,
        type: dType,
        title: dTitle,
        penaltyAmount: dPenalty,
        reason: dReason,
        effectiveDate: dDate,
        endDate: dEndDate || null,
        linkedPayrollMonth: dPayrollMonth || null,
      });
      toast.success("Đã thêm kỷ luật");
      resetDisciplineForm();
    } catch { toast.error("Không thể thêm kỷ luật."); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "reward") await deleteReward(deleteTarget.id);
      else await deleteDiscipline(deleteTarget.id);
      toast.success("Đã xóa");
      setDeleteTarget(null);
    } catch { toast.error("Không thể xóa."); }
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
        <Button size="sm" variant="outline" onClick={() => { fetchRewards(employeeId); fetchDisciplines(employeeId); }} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Khen thưởng ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-700">Khen thưởng ({empRewards.length})</span>
          </div>
          {canCreate && (
            <Button size="sm" onClick={() => setShowRewardDialog(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Thêm khen thưởng
            </Button>
          )}
        </div>
        {empRewards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">Chưa có khen thưởng nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {empRewards.map((r) => {
              const cfg = REWARD_TYPE_CONFIG[r.type];
              return (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs ${cfg.badgeColor}`}>
                      <Award className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-400">
                        {cfg.label_vi} · {formatDate(r.effectiveDate)}
                        {r.linkedPayrollMonth ? ` · Link lương ${r.linkedPayrollMonth}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.amount > 0 && (
                      <span className="text-sm font-semibold text-emerald-600">
                        +{formatCurrency(r.amount)}
                      </span>
                    )}
                    {canCreate && (
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget({ type: "reward", id: r.id, name: r.title })} className="h-7 w-7 p-0 text-red-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Kỷ luật ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-slate-700">Kỷ luật ({empDisciplines.length})</span>
          </div>
          {canCreate && (
            <Button size="sm" variant="outline" onClick={() => setShowDisciplineDialog(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Thêm kỷ luật
            </Button>
          )}
        </div>
        {empDisciplines.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">Chưa có kỷ luật nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {empDisciplines.map((d) => {
              const cfg = DISCIPLINE_TYPE_CONFIG[d.type];
              const stCfg = DISCIPLINE_STATUS_CONFIG[d.status];
              return (
                <div key={d.id} className={`flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 ${d.type === "dismiss" ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs ${cfg.badgeColor}`}>
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{d.title}</p>
                        <Badge className={`text-[10px] ${stCfg.badgeColor}`}>{stCfg.label_vi}</Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        {cfg.label_vi} · {formatDate(d.effectiveDate)}
                        {d.endDate ? ` → ${formatDate(d.endDate)}` : ""}
                        {d.linkedPayrollMonth ? ` · Link lương ${d.linkedPayrollMonth}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.penaltyAmount > 0 && (
                      <span className="text-sm font-semibold text-red-600">
                        -{formatCurrency(d.penaltyAmount)}
                      </span>
                    )}
                    {canCreate && (
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget({ type: "discipline", id: d.id, name: d.title })} className="h-7 w-7 p-0 text-red-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Reward Dialog ── */}
      <Dialog open={showRewardDialog} onOpenChange={(o) => { if (!o) resetRewardForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Thêm khen thưởng</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Loại</label>
              <Select value={rType} onValueChange={(v) => setRType(v as RewardType)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(REWARD_TYPE_CONFIG) as [RewardType, typeof REWARD_TYPE_CONFIG[RewardType]][]).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label_vi}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><label className="mb-1 block text-sm font-medium">Danh hiệu *</label><Input value={rTitle} onChange={(e) => setRTitle(e.target.value)} className="text-sm" /></div>
            <div><label className="mb-1 block text-sm font-medium">Tiền thưởng (VND)</label><Input type="number" value={rAmount} onChange={(e) => setRAmount(Number(e.target.value))} className="text-sm" /></div>
            <div><label className="mb-1 block text-sm font-medium">Lý do * (tối thiểu 10 ký tự)</label><textarea value={rReason} onChange={(e) => setRReason(e.target.value)} className="w-full rounded-md border p-2 text-sm" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium">Ngày hiệu lực *</label><Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className="text-sm" /></div>
              <div><label className="mb-1 block text-sm font-medium">Tháng lương</label><Input type="month" value={rPayrollMonth} onChange={(e) => setRPayrollMonth(e.target.value)} className="text-sm" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetRewardForm} disabled={formLoading}>Hủy</Button>
            <Button size="sm" onClick={handleAddReward} disabled={formLoading} className="gap-1.5">
              {formLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Discipline Dialog ── */}
      <Dialog open={showDisciplineDialog} onOpenChange={(o) => { if (!o) resetDisciplineForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Thêm kỷ luật</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Hình thức</label>
              <Select value={dType} onValueChange={(v) => setDType(v as DisciplineType)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(DISCIPLINE_TYPE_CONFIG) as [DisciplineType, typeof DISCIPLINE_TYPE_CONFIG[DisciplineType]][]).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label_vi}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><label className="mb-1 block text-sm font-medium">Nội dung *</label><Input value={dTitle} onChange={(e) => setDTitle(e.target.value)} className="text-sm" /></div>
            <div><label className="mb-1 block text-sm font-medium">Tiền phạt (VND)</label><Input type="number" value={dPenalty} onChange={(e) => setDPenalty(Number(e.target.value))} className="text-sm" /></div>
            <div><label className="mb-1 block text-sm font-medium">Lý do * (tối thiểu 10 ký tự)</label><textarea value={dReason} onChange={(e) => setDReason(e.target.value)} className="w-full rounded-md border p-2 text-sm" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium">Ngày hiệu lực *</label><Input type="date" value={dDate} onChange={(e) => setDDate(e.target.value)} className="text-sm" /></div>
              <div><label className="mb-1 block text-sm font-medium">Ngày kết thúc</label><Input type="date" value={dEndDate} onChange={(e) => setDEndDate(e.target.value)} className="text-sm" /></div>
            </div>
            <div><label className="mb-1 block text-sm font-medium">Tháng lương</label><Input type="month" value={dPayrollMonth} onChange={(e) => setDPayrollMonth(e.target.value)} className="text-sm" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetDisciplineForm} disabled={formLoading}>Hủy</Button>
            <Button size="sm" onClick={handleAddDiscipline} disabled={formLoading} className="gap-1.5">
              {formLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Xóa bản ghi"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.name ?? ""}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
