"use client";

// ============================================================================
// GK-HRMS — QualificationPanel
// Quản lý bằng cấp & chứng chỉ của nhân viên — đọc/ghi employeeStore
// RBAC: View: hr_admin, super_admin, branch_manager
//       Create/Update/Delete: hr_admin, super_admin
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  GraduationCap,
  Award,
  BookOpen,
  FileText,
  Loader2,
  AlertTriangle,
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
import { useEmployeeStore } from "@/store/employeeStore";
import { usePermission } from "@/hooks/usePermission";
import { formatDate } from "@/lib/utils";
import type { Qualification, QualificationType } from "@/types/employee";
import { QUALIFICATION_TYPE_CONFIG } from "@/types/employee";

// ---------------------------------------------------------------------------
// Icon Map
// ---------------------------------------------------------------------------

const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  GraduationCap,
  Award,
  BookOpen,
  FileText,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trạng thái hết hạn */
function getExpiryStatus(expiryDate: string | null | undefined): "expired" | "expiring" | "ok" {
  if (!expiryDate) return "ok";
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (expiry < now) return "expired";
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return "expiring";
  return "ok";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QualificationPanelProps {
  employeeId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QualificationPanel({ employeeId }: QualificationPanelProps) {
  const canCreate = usePermission("employee", "create");
  const qualifications = useEmployeeStore((s) => s.qualifications);
  const fetchQualifications = useEmployeeStore((s) => s.fetchQualifications);
  const addQualification = useEmployeeStore((s) => s.addQualification);
  const updateQualification = useEmployeeStore((s) => s.updateQualification);
  const deleteQualification = useEmployeeStore((s) => s.deleteQualification);

  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Qualification | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Qualification | null>(null);

  // Form state
  const [type, setType] = useState<QualificationType>("degree");
  const [name, setName] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Qualifications for this employee
  const items = qualifications.filter((q) => q.employeeId === employeeId);

  // Group by type
  const grouped = useMemo(() => {
    const groups: Record<QualificationType, Qualification[]> = {
      degree: [],
      certificate: [],
      training: [],
      other: [],
    };
    for (const q of items) {
      groups[q.type].push(q);
    }
    return groups;
  }, [items]);

  // ── Fetch ──
  useEffect(() => {
    setLoading(true);
    fetchQualifications(employeeId).finally(() => setLoading(false));
  }, [employeeId, fetchQualifications]);

  // ── Reset form ──
  const resetForm = () => {
    setType("degree");
    setName("");
    setIssuedBy("");
    setIssuedDate("");
    setExpiryDate("");
    setFormErrors({});
    setEditTarget(null);
    setShowDialog(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (qual: Qualification) => {
    setEditTarget(qual);
    setType(qual.type);
    setName(qual.name);
    setIssuedBy(qual.issuedBy);
    setIssuedDate(qual.issuedDate);
    setExpiryDate(qual.expiryDate ?? "");
    setFormErrors({});
    setShowDialog(true);
  };

  // ── Validate ──
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2)
      errors.name = "Vui lòng nhập tên bằng cấp (tối thiểu 2 ký tự)";
    if (!issuedBy.trim() || issuedBy.trim().length < 2)
      errors.issuedBy = "Vui lòng nhập nơi cấp (tối thiểu 2 ký tự)";
    if (!issuedDate) errors.issuedDate = "Vui lòng nhập ngày cấp";

    // issuedDate không được là ngày tương lai
    if (issuedDate && new Date(issuedDate) > new Date()) {
      errors.issuedDate = "Ngày cấp không được là ngày tương lai";
    }

    // expiryDate phải sau issuedDate nếu có
    if (expiryDate && issuedDate && new Date(expiryDate) <= new Date(issuedDate)) {
      errors.expiryDate = "Ngày hết hạn phải sau ngày cấp";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validate()) return;

    setFormLoading(true);
    try {
      const payload = {
        employeeId,
        type,
        name: name.trim(),
        issuedBy: issuedBy.trim(),
        issuedDate,
        expiryDate: expiryDate || null,
        documentUrl: "",
      };

      if (editTarget) {
        await updateQualification(editTarget.id, payload);
        toast.success("Đã cập nhật bằng cấp");
      } else {
        await addQualification(payload);
        toast.success("Đã thêm bằng cấp");
      }
      resetForm();
    } catch {
      toast.error("Không thể lưu bằng cấp. Vui lòng thử lại.");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteQualification(deleteTarget.id);
      toast.success("Đã xóa bằng cấp");
      setDeleteTarget(null);
    } catch {
      toast.error("Không thể xóa bằng cấp. Vui lòng thử lại.");
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            {items.length} bằng cấp & chứng chỉ
          </span>
        </div>
        {canCreate && (
          <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Thêm bằng cấp
          </Button>
        )}
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <GraduationCap className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            Chưa có bằng cấp hoặc chứng chỉ nào
          </p>
          {canCreate && (
            <Button
              size="sm"
              variant="outline"
              onClick={openCreateDialog}
              className="mt-3 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm bằng cấp
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {(Object.entries(grouped) as [QualificationType, Qualification[]][]).map(
            ([qType, quals]) => {
              if (quals.length === 0) return null;
              const config = QUALIFICATION_TYPE_CONFIG[qType];
              const Icon = ICON_MAP[config.icon] ?? FileText;

              return (
                <div key={qType}>
                  {/* Group header */}
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">
                      {config.label_vi} ({quals.length})
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    {quals.map((q) => {
                      const status = getExpiryStatus(q.expiryDate);
                      return (
                        <div
                          key={q.id}
                          className={`flex items-start justify-between rounded-lg border p-4 transition-colors ${
                            status === "expired"
                              ? "border-red-200 bg-red-50/30"
                              : status === "expiring"
                              ? "border-amber-200 bg-amber-50/30"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border ${config.badgeColor}`}>
                              <Icon className="h-4 w-4" />
                            </div>

                            {/* Info */}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-800">
                                  {q.name}
                                </span>
                                {status === "expired" && (
                                  <Badge className="gap-1 border-red-200 bg-red-100 text-red-700 text-[10px]">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    Đã hết hạn
                                  </Badge>
                                )}
                                {status === "expiring" && (
                                  <Badge className="gap-1 border-amber-200 bg-amber-100 text-amber-700 text-[10px]">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    Sắp hết hạn
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Nơi cấp: {q.issuedBy}
                              </p>
                              <p className="text-xs text-slate-400">
                                Ngày cấp: {formatDate(q.issuedDate)}
                                {" · "}
                                Hết hạn:{" "}
                                {q.expiryDate
                                  ? formatDate(q.expiryDate)
                                  : "Không giới hạn"}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          {canCreate && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(q)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget(q)}
                                className="h-8 w-8 p-0 text-red-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Cập nhật bằng cấp" : "Thêm bằng cấp"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Loại <span className="text-red-500">*</span>
              </label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as QualificationType)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(QUALIFICATION_TYPE_CONFIG) as [
                      QualificationType,
                      (typeof QUALIFICATION_TYPE_CONFIG)[QualificationType],
                    ][]
                  ).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label_vi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tên bằng cấp / chứng chỉ <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Bằng Đại học Kinh tế, Chứng chỉ TOEIC..."
                className="text-sm"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>

            {/* IssuedBy */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nơi cấp <span className="text-red-500">*</span>
              </label>
              <Input
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                placeholder="VD: ĐH Kinh tế TP.HCM, Trung tâm IIG..."
                className="text-sm"
              />
              {formErrors.issuedBy && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.issuedBy}
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Ngày cấp <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="text-sm"
                />
                {formErrors.issuedDate && (
                  <p className="mt-1 text-xs text-red-500">
                    {formErrors.issuedDate}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Ngày hết hạn
                </label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={issuedDate || undefined}
                  className="text-sm"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Để trống nếu không có thời hạn
                </p>
                {formErrors.expiryDate && (
                  <p className="mt-0.5 text-xs text-red-500">
                    {formErrors.expiryDate}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              disabled={formLoading}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={formLoading}
              className="gap-1.5"
            >
              {formLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editTarget ? "Cập nhật" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa bằng cấp"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.name ?? ""}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
