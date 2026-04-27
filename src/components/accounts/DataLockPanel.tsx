"use client";

// ============================================================================
// GK-HRMS — DataLockPanel
// Quản lý khóa/mở kỳ chấm công + kỳ lương
// RBAC: super_admin only (lock/unlock), hr_admin (view only)
// ============================================================================

import { useState, useEffect, useMemo } from "react";
import { Lock, Unlock, Shield, AlertTriangle, History } from "lucide-react";
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
import { useSupplementStore } from "@/store/supplementStore";
import { useAccountStore } from "@/store/accountStore";
import { LOCK_TYPE_CONFIG } from "@/types/supplement";
import type { LockType } from "@/types/supplement";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const formatDatetime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// ---------------------------------------------------------------------------
// LockSection — 1 section cho 1 loại khóa
// ---------------------------------------------------------------------------

interface LockSectionProps {
  type: LockType;
  canLock: boolean;
}

function LockSection({ type, canLock }: LockSectionProps) {
  const isLocked = useSupplementStore((s) => s.isLocked);
  const lockPeriod = useSupplementStore((s) => s.lockPeriod);
  const unlockPeriod = useSupplementStore((s) => s.unlockPeriod);
  const dataLocks = useSupplementStore((s) => s.dataLocks);

  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [note, setNote] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<
    "lock" | "unlock" | null
  >(null);
  const [unlockReason, setUnlockReason] = useState("");

  const locked = isLocked(type, month);
  const config = LOCK_TYPE_CONFIG[type];

  // Find lock record for current month
  const lockRecord = dataLocks.find(
    (l) => l.type === type && l.period === month && l.isLocked
  );

  const handleLock = async () => {
    try {
      await lockPeriod(type, month, note || undefined);
      toast.success(`Đã khóa ${config.label_vi} tháng ${month}`);
      setNote("");
      setConfirmDialog(null);
    } catch {
      toast.error("Không thể khóa kỳ. Vui lòng thử lại.");
    }
  };

  const handleUnlock = async () => {
    if (!unlockReason.trim()) {
      toast.error("Vui lòng nhập lý do mở khóa");
      return;
    }
    if (!lockRecord) return;
    try {
      await unlockPeriod(lockRecord.id);
      toast.success(`Đã mở khóa ${config.label_vi} tháng ${month}`);
      setUnlockReason("");
      setConfirmDialog(null);
    } catch {
      toast.error("Không thể mở khóa. Vui lòng thử lại.");
    }
  };

  const warningText =
    type === "attendance_period"
      ? "Sau khi khóa, không thể duyệt bổ sung công cho tháng này"
      : "Sau khi khóa, không thể chỉnh sửa bảng lương tháng này";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-slate-600" />
        <h3 className="text-base font-semibold text-slate-800">
          {config.label_vi}
        </h3>
      </div>

      <p className="mb-4 text-sm text-slate-500">{config.description}</p>

      {/* Month picker + status */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Tháng</label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 w-40 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Trạng thái
          </label>
          {locked ? (
            <Badge
              variant="outline"
              className="h-9 gap-1 border-red-200 bg-red-50 px-3 text-red-600"
            >
              <Lock className="h-3.5 w-3.5" />
              Đã khóa
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="h-9 gap-1 border-emerald-200 bg-emerald-50 px-3 text-emerald-600"
            >
              <Unlock className="h-3.5 w-3.5" />
              Đang mở
            </Badge>
          )}
        </div>

        {canLock && (
          <>
            {!locked && (
              <div className="flex items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Ghi chú
                  </label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Lý do khóa kỳ..."
                    className="h-9 w-52 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-red-600 hover:bg-red-700"
                  onClick={() => setConfirmDialog("lock")}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Khóa kỳ
                </Button>
              </div>
            )}
            {locked && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={() => setConfirmDialog("unlock")}
              >
                <Unlock className="h-3.5 w-3.5" />
                Mở khóa
              </Button>
            )}
          </>
        )}
      </div>

      {/* Warning */}
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>{warningText}</span>
      </div>

      {/* Confirm Lock Dialog */}
      <Dialog
        open={confirmDialog === "lock"}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận khóa kỳ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bạn có chắc muốn khóa <strong>{config.label_vi}</strong> tháng{" "}
            <strong>{month}</strong>?
          </p>
          <p className="text-xs text-amber-600">{warningText}</p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog(null)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleLock}
            >
              <Lock className="mr-1 h-3.5 w-3.5" />
              Khóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Unlock Dialog */}
      <Dialog
        open={confirmDialog === "unlock"}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog(null);
            setUnlockReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận mở khóa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Mở khóa <strong>{config.label_vi}</strong> tháng{" "}
            <strong>{month}</strong>?
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Lý do mở khóa <span className="text-red-500">*</span>
            </label>
            <Input
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="Nhập lý do mở khóa..."
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmDialog(null);
                setUnlockReason("");
              }}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={!unlockReason.trim()}
              onClick={handleUnlock}
            >
              <Unlock className="mr-1 h-3.5 w-3.5" />
              Mở khóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataLockPanel — Main Component
// ---------------------------------------------------------------------------

export function DataLockPanel() {
  const currentRole = useAccountStore((s) => s.currentUser.role);
  const dataLocks = useSupplementStore((s) => s.dataLocks);
  const fetchDataLocks = useSupplementStore((s) => s.fetchDataLocks);

  const canLock = currentRole === "super_admin";

  useEffect(() => {
    fetchDataLocks();
  }, [fetchDataLocks]);

  // Sort locks by lockedAt desc
  const sortedLocks = useMemo(
    () =>
      [...dataLocks].sort((a, b) => b.lockedAt.localeCompare(a.lockedAt)),
    [dataLocks]
  );

  return (
    <div className="space-y-6">
      {/* Lock Sections */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LockSection type="attendance_period" canLock={canLock} />
        <LockSection type="payroll_period" canLock={canLock} />
      </div>

      {/* History Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
          <History className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">
            Lịch sử khóa/mở kỳ
          </h3>
        </div>

        {sortedLocks.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Chưa có lịch sử khóa kỳ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500">Kỳ</th>
                  <th className="px-4 py-3 font-medium text-slate-500">
                    Loại
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-500">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-500">
                    Khóa bởi
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-500">
                    Thời gian khóa
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-500">
                    Mở khóa bởi
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-500">
                    Thời gian mở
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-500">
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLocks.map((lock) => (
                  <tr
                    key={lock.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {lock.period}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {LOCK_TYPE_CONFIG[lock.type].label_vi}
                    </td>
                    <td className="px-4 py-3">
                      {lock.isLocked ? (
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-red-600"
                        >
                          <Lock className="mr-1 h-3 w-3" />
                          Đang khóa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-600"
                        >
                          <Unlock className="mr-1 h-3 w-3" />
                          Đã mở
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {lock.lockedBy}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {formatDatetime(lock.lockedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {lock.unlockedBy ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {lock.unlockedAt ? formatDatetime(lock.unlockedAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {lock.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
